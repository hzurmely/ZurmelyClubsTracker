/**
 * Cliente da API pública de Pro Clubs da EA.
 *
 * IMPORTANTE: essa API não pode ser chamada direto do navegador. Ela não manda
 * cabeçalhos de CORS. Por isso tudo aqui roda no servidor (route handlers em
 * app/api/ea/*), que funcionam tanto no `npm run dev` quanto como função
 * serverless na Vercel.
 *
 * A EA fica atrás de um WAF que responde 403 para requisições que ele considera
 * automatizadas. O conjunto de cabeçalhos que passa muda de tempos em tempos,
 * então aqui existe uma lista de variantes: na primeira falha por 403 o cliente
 * tenta a próxima e memoriza a que funcionou. Veja /api/ea/diag para inspecionar.
 */

import { fixText } from '@/lib/format';

/**
 * De onde os dados vem.
 *
 * Por padrao falamos direto com a EA, que e o que funciona quando o site roda
 * na sua maquina. Em servidor de nuvem a EA responde 403 (ela bloqueia faixas
 * de IP de datacenter), e ai a variavel EA_PROXY_URL aponta para a ponte no
 * Cloudflare Worker, que fica em worker/index.js neste mesmo repositorio.
 *
 * Exemplo: EA_PROXY_URL=https://zurmely-ea-bridge.SEU-SUBDOMINIO.workers.dev
 */
const PROXY = (process.env.EA_PROXY_URL || '').replace(/\/+$/, '');
const BASE = PROXY ? `${PROXY}/api/fc` : 'https://proclubs.ea.com/api/fc';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Variantes de cabeçalho, da mais "limpa" para a mais elaborada.
 * A primeira imita exatamente o que um navegador manda ao abrir a URL na barra
 * de endereços, que é o caso que sabidamente funciona.
 */
export const HEADER_VARIANTS = [
  {
    id: 'navegador-simples',
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  },
  {
    id: 'json-com-referer',
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://proclubs.ea.com/',
    },
  },
  {
    id: 'minimo',
    headers: {
      'User-Agent': CHROME_UA,
      Accept: '*/*',
    },
  },
];

/** Índice da variante que funcionou por último. Vale por instância da função. */
let preferred = 0;

const REVALIDATE = 60;

export class EaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'EaError';
    this.status = status || 502;
  }
}

export function buildUrl(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Uma tentativa, com uma variante específica. Devolve o status cru. */
export async function rawFetch(url, variantIndex, revalidate = REVALIDATE) {
  const variant = HEADER_VARIANTS[variantIndex];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: variant.headers,
      signal: controller.signal,
      redirect: 'follow',
      next: { revalidate },
    });
    const text = await res.text();
    return { status: res.status, text, variant: variant.id };
  } finally {
    clearTimeout(timer);
  }
}

async function eaFetch(path, params, { revalidate = REVALIDATE } = {}) {
  const url = buildUrl(path, params);

  // Tenta a variante preferida primeiro e, se levar bloqueio, percorre as outras.
  const order = [preferred, ...HEADER_VARIANTS.map((_, i) => i).filter((i) => i !== preferred)];
  let last = null;

  for (const index of order) {
    let attempt;
    try {
      attempt = await rawFetch(url, index, revalidate);
    } catch (err) {
      if (err.name === 'AbortError') {
        last = new EaError('A API da EA demorou demais para responder', 504);
      } else {
        last = new EaError(`Não consegui falar com a API da EA: ${err.message}`, 502);
      }
      continue;
    }

    const { status, text } = attempt;

    if (status === 404) return null;

    if (status === 403 || status === 429 || status >= 500) {
      last = new EaError(`A EA respondeu ${status} em ${path}`, status);
      continue; // vale tentar outra variante
    }

    if (status >= 400) {
      throw new EaError(`A EA respondeu ${status} em ${path}`, status);
    }

    preferred = index;
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new EaError('A EA devolveu uma resposta que não é JSON', 502);
    }
  }

  throw last || new EaError('A API da EA não respondeu', 502);
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

/**
 * Busca clubes pelo nome.
 * Só existe um endpoint de busca hoje: /allTimeLeaderboard/search.
 * O antigo /clubs/search foi removido pela EA e responde 404.
 */
export async function searchClubs(platform, clubName) {
  const data = await eaFetch('/allTimeLeaderboard/search', { platform, clubName }, { revalidate: 30 });
  if (!data) return [];

  const raw = Array.isArray(data) ? data : Object.values(data);
  return raw
    .map((item) => {
      const info = item.clubInfo || {};
      const id = String(info.clubId ?? item.clubId ?? '');
      if (!id) return null;
      return {
        clubId: id,
        platform: item.platform || platform,
        name: fixText(info.name || item.clubName || `Clube ${id}`),
        customKit: info.customKit || null,
        regionId: info.regionId ?? null,
        wins: num(item.wins),
        losses: num(item.losses),
        ties: num(item.ties),
        gamesPlayed: num(item.gamesPlayed),
        points: num(item.points),
        currentDivision: num(item.currentDivision),
        bestDivision: num(item.bestDivision),
      };
    })
    .filter(Boolean);
}

export async function clubInfo(platform, clubId) {
  const data = await eaFetch('/clubs/info', { platform, clubIds: clubId });
  if (!data) return null;
  const entry = data[clubId] || Object.values(data)[0];
  if (!entry) return null;
  return {
    clubId: String(entry.clubId ?? clubId),
    name: fixText(entry.name || `Clube ${clubId}`),
    regionId: entry.regionId ?? null,
    teamId: entry.teamId ?? null,
    customKit: entry.customKit || null,
    stadium: fixText(entry.customKit?.stadName || ''),
    platform,
  };
}

export async function overallStats(platform, clubId) {
  const data = await eaFetch('/clubs/overallStats', { platform, clubIds: clubId });
  if (!data) return null;
  const entry = Array.isArray(data) ? data[0] : data[clubId] || Object.values(data)[0];
  if (!entry) return null;

  const wins = num(entry.wins);
  const losses = num(entry.losses);
  const ties = num(entry.ties);
  const played = num(entry.gamesPlayed) || wins + losses + ties;

  return {
    gamesPlayed: played,
    gamesPlayedPlayoff: num(entry.gamesPlayedPlayoff),
    wins,
    losses,
    ties,
    goals: num(entry.goals),
    goalsAgainst: num(entry.goalsAgainst),
    skillRating: num(entry.skillRating),
    bestDivision: num(entry.bestDivision),
    promotions: num(entry.promotions),
    relegations: num(entry.relegations),
    wstreak: num(entry.wstreak),
    unbeatenstreak: num(entry.unbeatenstreak),
    leagueAppearances: num(entry.leagueAppearances),
  };
}

/**
 * Elenco. A EA separa em dois endpoints e cada um traz um conjunto diferente:
 *
 *   /members/stats         → temporada atual, com percentuais (passe, desarme,
 *                            finalização, vitórias), cartões e o sobre do pro.
 *   /members/career/stats  → carreira inteira, mas só jogos, gols, assistências,
 *                            craque do jogo e nota média.
 *
 * Aqui os dois são buscados em paralelo e casados pelo nome do jogador.
 */
export async function members(platform, clubId) {
  const [seasonR, careerR] = await Promise.allSettled([
    eaFetch('/members/stats', { platform, clubId }),
    eaFetch('/members/career/stats', { platform, clubId }),
  ]);

  const season = seasonR.status === 'fulfilled' ? seasonR.value?.members || [] : [];
  const career = careerR.status === 'fulfilled' ? careerR.value?.members || [] : [];

  const byName = new Map();

  for (const m of season) {
    const name = fixText(m.name || m.proName || 'Desconhecido');
    byName.set(name, {
      name,
      pos: m.favoritePosition || m.proPos || '',
      proOverall: num(m.proOverall),
      proHeight: num(m.proHeight),
      proStyle: m.proStyle ?? null,
      season: {
        gamesPlayed: num(m.gamesPlayed),
        goals: num(m.goals),
        assists: num(m.assists),
        mom: num(m.manOfTheMatch),
        rating: numf(m.ratingAve),
        winRate: numf(m.winRate),
        passesMade: num(m.passesMade),
        passSuccessRate: numf(m.passSuccessRate),
        tacklesMade: num(m.tacklesMade),
        tackleSuccessRate: numf(m.tackleSuccessRate),
        shotSuccessRate: numf(m.shotSuccessRate),
        cleanSheetsDef: num(m.cleanSheetsDef),
        cleanSheetsGK: num(m.cleanSheetsGK),
        redCards: num(m.redCards),
      },
      career: null,
    });
  }

  for (const m of career) {
    const name = fixText(m.name || 'Desconhecido');
    const entry = byName.get(name) || {
      name,
      pos: m.favoritePosition || m.proPos || '',
      proOverall: 0,
      proHeight: 0,
      proStyle: null,
      season: null,
    };
    entry.career = {
      gamesPlayed: num(m.gamesPlayed),
      goals: num(m.goals),
      assists: num(m.assists),
      mom: num(m.manOfTheMatch),
      rating: numf(m.ratingAve),
    };
    if (!entry.pos) entry.pos = m.favoritePosition || m.proPos || '';
    byName.set(name, entry);
  }

  return [...byName.values()];
}

export async function matches(platform, clubId, matchType = 'leagueMatch') {
  const data = await eaFetch('/clubs/matches', {
    platform,
    clubIds: clubId,
    matchType,
    maxResultCount: 20,
  });
  if (!Array.isArray(data)) return [];
  return data.map((m) => normalizeMatch(m, String(clubId), matchType)).filter(Boolean);
}

function normalizeMatch(match, clubId, matchType) {
  const clubs = match.clubs || {};
  const mine = clubs[clubId];
  const opponentId = Object.keys(clubs).find((id) => id !== clubId);
  const opponent = opponentId ? clubs[opponentId] : null;
  if (!mine) return null;

  const goalsFor = num(mine.goals);
  const goalsAgainst = num(mine.goalsAgainst);

  const playersRaw = (match.players && match.players[clubId]) || {};
  const players = Object.entries(playersRaw).map(([id, p]) => ({
    id,
    name: fixText(p.playername || p.playerName || 'Jogador'),
    pos: p.pos || '',
    goals: num(p.goals),
    assists: num(p.assists),
    shots: num(p.shots),
    passesMade: num(p.passesmade),
    passAttempts: num(p.passattempts),
    tacklesMade: num(p.tacklesmade),
    tackleAttempts: num(p.tackleattempts),
    saves: num(p.saves),
    goalsConceded: num(p.goalsconceded),
    rating: numf(p.rating),
    mom: String(p.mom) === '1',
    redCards: num(p.redcards),
    minutes: Math.round(num(p.secondsPlayed) / 60),
  }));

  return {
    matchId: String(match.matchId ?? ''),
    timestamp: num(match.timestamp) || num(mine.date),
    matchType: matchType === 'playoffMatch' ? 'Playoff' : 'Liga',
    goalsFor,
    goalsAgainst,
    result: goalsFor > goalsAgainst ? 'V' : goalsFor < goalsAgainst ? 'D' : 'E',
    opponent: opponent
      ? {
          clubId: opponentId,
          name: fixText(opponent.details?.name || `Clube ${opponentId}`),
          customKit: opponent.details?.customKit || null,
        }
      : { clubId: null, name: 'Adversário desconhecido', customKit: null },
    stadium: fixText(mine.details?.customKit?.stadName || ''),
    players: players.sort((a, b) => b.rating - a.rating),
  };
}

/* ------------------------------------------------------------------ */

function num(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function numf(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export const isDemo = () => process.env.EA_DEMO === '1';
