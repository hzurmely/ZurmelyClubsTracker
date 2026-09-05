/**
 * Cliente da API publica de Pro Clubs da EA.
 *
 * IMPORTANTE: essa API nao pode ser chamada direto do navegador. Ela nao manda
 * cabecalhos de CORS e bloqueia requisicoes sem Referer da EA. Por isso tudo aqui
 * roda no servidor (route handlers em app/api/ea/*), que funcionam tanto no
 * `npm run dev` quanto como funcao serverless na Vercel.
 */

const BASE = 'https://proclubs.ea.com/api/fc';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.ea.com/',
  Origin: 'https://www.ea.com',
  'sec-ch-ua-platform': '"Windows"',
};

/** Tempo de cache em segundos. Evita martelar a EA e deixa o site rapido. */
const REVALIDATE = 60;

export class EaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'EaError';
    this.status = status || 502;
  }
}

function buildUrl(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function eaFetch(path, params, { revalidate = REVALIDATE } = {}) {
  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
      next: { revalidate },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new EaError(`A EA respondeu ${res.status} em ${path}`, res.status);
    }

    const text = await res.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new EaError('A EA devolveu uma resposta que não é JSON', 502);
    }
  } catch (err) {
    if (err instanceof EaError) throw err;
    if (err.name === 'AbortError') {
      throw new EaError('A API da EA demorou demais para responder', 504);
    }
    throw new EaError(`Não consegui falar com a API da EA: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

/**
 * Busca clubes pelo nome. A EA tem dois endpoints de busca e eles se alternam
 * em disponibilidade, entao tentamos os dois.
 */
export async function searchClubs(platform, clubName) {
  const attempts = [
    ['/allTimeLeaderboard/search', { platform, clubName }],
    ['/clubs/search', { platform, clubName }],
  ];

  let lastError = null;
  for (const [path, params] of attempts) {
    try {
      const data = await eaFetch(path, params, { revalidate: 30 });
      const list = normalizeSearch(data, platform);
      if (list.length) return list;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
}

function normalizeSearch(data, platform) {
  if (!data) return [];
  const raw = Array.isArray(data) ? data : Object.values(data);
  return raw
    .map((item) => {
      const info = item.clubInfo || item.club || item;
      const id = String(info.clubId ?? item.clubId ?? '');
      if (!id) return null;
      return {
        clubId: id,
        platform,
        name: info.name || item.name || `Clube ${id}`,
        customKit: info.customKit || null,
        regionId: info.regionId ?? null,
        wins: num(item.wins),
        losses: num(item.losses),
        ties: num(item.ties),
        gamesPlayed: num(item.gamesPlayed),
        points: num(item.points),
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
    name: entry.name || `Clube ${clubId}`,
    regionId: entry.regionId ?? null,
    teamId: entry.teamId ?? null,
    customKit: entry.customKit || null,
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
    lastMatch: Array.from({ length: 10 }, (_, i) => entry[`lastMatch${i}`]).filter(
      (v) => v !== undefined && v !== null,
    ),
  };
}

export async function members(platform, clubId) {
  const data = await eaFetch('/members/career/stats', { platform, clubId });
  const list = data?.members || [];
  return list.map((m) => ({
    name: m.name || m.proName || 'Desconhecido',
    proName: m.proName || m.name || '',
    gamesPlayed: num(m.gamesPlayed),
    goals: num(m.goals),
    assists: num(m.assists),
    manOfTheMatch: num(m.manOfTheMatch),
    ratingAve: numf(m.ratingAve),
    passesMade: num(m.passesMade),
    passSuccessRate: numf(m.passSuccessRate),
    tacklesMade: num(m.tacklesMade),
    tackleSuccessRate: numf(m.tackleSuccessRate),
    shotSuccessRate: numf(m.shotSuccessRate),
    winRate: numf(m.winRate),
    cleanSheetsDef: num(m.cleanSheetsDef),
    cleanSheetsGK: num(m.cleanSheetsGK),
    redCards: num(m.redCards),
    favoritePosition: m.favoritePosition || '',
    proPos: m.proPos ?? null,
    proOverall: num(m.proOverall),
    proHeight: num(m.proHeight),
  }));
}

export async function matches(platform, clubId, matchType = 'leagueMatch') {
  const data = await eaFetch('/clubs/matches', {
    platform,
    clubIds: clubId,
    matchType,
    maxResultCount: 20,
  });
  if (!Array.isArray(data)) return [];
  return data.map((m) => normalizeMatch(m, String(clubId))).filter(Boolean);
}

function normalizeMatch(match, clubId) {
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
    name: p.playername || p.playerName || 'Jogador',
    pos: p.pos || '',
    goals: num(p.goals),
    assists: num(p.assists),
    shots: num(p.shots),
    passesMade: num(p.passesmade),
    passAttempts: num(p.passattempts),
    tacklesMade: num(p.tacklesmade),
    saves: num(p.saves),
    rating: numf(p.rating),
    mom: String(p.mom) === '1',
    redCards: num(p.redcards),
  }));

  return {
    matchId: String(match.matchId ?? ''),
    timestamp: num(match.timestamp),
    goalsFor,
    goalsAgainst,
    result: goalsFor > goalsAgainst ? 'V' : goalsFor < goalsAgainst ? 'D' : 'E',
    opponent: opponent
      ? {
          clubId: opponentId,
          name: opponent.details?.name || `Clube ${opponentId}`,
          customKit: opponent.details?.customKit || null,
        }
      : { clubId: null, name: 'Adversário desconhecido', customKit: null },
    stadium: mine.details?.customKit?.stadName || mine.details?.stadName || '',
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
