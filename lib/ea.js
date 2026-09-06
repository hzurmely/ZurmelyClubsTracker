/**
 * Client for EA's public Pro Clubs API.
 *
 * IMPORTANT: this API cannot be called straight from the browser. It does not
 * send CORS headers. That is why everything here runs on the server (route
 * handlers in app/api/ea/*), which work both under `npm run dev` and as a
 * serverless function on Vercel.
 *
 * EA sits behind a WAF that answers 403 to requests it considers automated. The
 * set of headers that gets through changes from time to time, so there is a list
 * of variants here: on the first 403 failure the client tries the next one and
 * remembers the one that worked. See /api/ea/diag to inspect this.
 */

import { fixText } from '@/lib/format';
import { arquivoAtivo, guardarHistorico } from '@/lib/arquivo';

/**
 * Where the data comes from.
 *
 * By default we talk straight to EA, which is what works when the site runs on
 * your own machine. On a cloud server EA answers 403 (it blocks datacenter IP
 * ranges), and that is when the EA_PROXY_URL variable points to the Cloudflare
 * Worker bridge, which lives in worker/index.js in this same repository.
 *
 * Example: EA_PROXY_URL=https://zurmely-ea-bridge.SEU-SUBDOMINIO.workers.dev
 */
const PROXY = (process.env.EA_PROXY_URL || '').replace(/\/+$/, '');
const EA_DIRETO = 'https://proclubs.ea.com/api/fc';
const BASE = PROXY ? `${PROXY}/api/fc` : EA_DIRETO;

/**
 * Last line of defense.
 *
 * If every header variant gets a 403 (the case of a cloud server blocked by IP
 * range), the client repeats the request through the public r.jina.ai reader,
 * which goes out through a range EA accepts and returns the response body
 * untouched. It is slow and rate limited, so it only kicks in after the normal
 * path has failed. Turn it off with EA_LEITOR=0.
 */
const LEITOR = 'https://r.jina.ai/';
const usarLeitor = process.env.EA_LEITOR !== '0';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Header variants, from the "cleanest" to the most elaborate.
 * The first one mimics exactly what a browser sends when you open the URL in
 * the address bar, which is the case that is known to work.
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

/** Index of the variant that worked last. Scoped to each function instance. */
let preferred = 0;

const REVALIDATE = 60;

export class EaError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'EaError';
    this.status = status || 502;
  }
}

export function buildUrl(path, params = {}, base = BASE) {
  const url = new URL(base + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** A single attempt, with one specific variant. Returns the raw status. */
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

  // Try the preferred variant first and, if it gets blocked, walk through the others.
  const order = [preferred, ...HEADER_VARIANTS.map((_, i) => i).filter((i) => i !== preferred)];
  let last = null;

  for (const index of order) {
    let attempt;
    try {
      attempt = await rawFetch(url, index, revalidate);
    } catch (err) {
      if (err.name === 'AbortError') {
        last = new EaError('The EA API took too long to respond', 504);
      } else {
        last = new EaError(`Could not reach the EA API: ${err.message}`, 502);
      }
      continue;
    }

    const { status, text } = attempt;

    if (status === 404) return null;

    if (status === 403 || status === 429 || status >= 500) {
      last = new EaError(`EA responded ${status} on ${path}`, status);
      continue; // worth trying another variant
    }

    if (status >= 400) {
      throw new EaError(`EA responded ${status} on ${path}`, status);
    }

    preferred = index;
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new EaError('EA returned a response that is not JSON', 502);
    }
  }

  // Nothing got through on the normal path. Try the reader, just once.
  if (usarLeitor) {
    try {
      const viaLeitor = LEITOR + buildUrl(path, params, EA_DIRETO);
      const res = await fetch(viaLeitor, {
        headers: { ...HEADER_VARIANTS[1].headers, 'x-return-format': 'text' },
        next: { revalidate },
      });
      if (res.ok) {
        const text = await res.text();
        if (!text.trim()) return null;
        try {
          return JSON.parse(text);
        } catch {
          // It was not JSON: the reader returned an error page. Falls through to the throw below.
        }
      }
    } catch {
      // No luck. Move on to the original error, which is more informative.
    }
  }

  throw last || new EaError('The EA API did not respond', 502);
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

/**
 * Searches for clubs by name.
 * There is only one search endpoint today: /allTimeLeaderboard/search.
 * The old /clubs/search was removed by EA and answers 404.
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
 * Squad. EA splits this into two endpoints and each one brings a different set:
 *
 *   /members/stats         → current season, with percentages (passing, tackling,
 *                            shooting, wins), cards and the pro's profile.
 *   /members/career/stats  → the whole career, but only games, goals, assists,
 *                            man of the match and average rating.
 *
 * Here the two are fetched in parallel and matched up by the player's name.
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

/**
 * Match history.
 *
 * With `completo` the normalization also keeps the opponent's squad, which is
 * what the match analysis page needs. The club listing does not use it, and that
 * is why the default is off: it would be twice the data for nothing.
 */
export async function matches(platform, clubId, matchType = 'leagueMatch', completo = false) {
  const data = await eaFetch('/clubs/matches', {
    platform,
    clubIds: clubId,
    matchType,
    maxResultCount: 20,
  });
  if (!Array.isArray(data)) return [];
  return data.map((m) => normalizeMatch(m, String(clubId), matchType, completo)).filter(Boolean);
}

/**
 * One specific match, with both squads.
 *
 * EA has no endpoint for a match by id: the way around it is to ask for the
 * league and playoff listings and look inside them. Since those two calls are
 * the same ones the club page already makes, in practice this usually comes
 * straight out of the cache.
 */
export async function matchDetail(platform, clubId, matchId) {
  const [ligaR, playoffR] = await Promise.allSettled([
    matches(platform, clubId, 'leagueMatch', true),
    matches(platform, clubId, 'playoffMatch', true),
  ]);
  const liga = ligaR.status === 'fulfilled' ? ligaR.value : [];
  const playoff = playoffR.status === 'fulfilled' ? playoffR.value : [];
  let todas = [...liga, ...playoff].sort((a, b) => b.timestamp - a.timestamp);

  // In the desktop program the archive answers for matches EA has already
  // dropped, so an old link keeps working instead of turning into a dead page.
  // It also means the head to head can reach back further than EA does.
  if (arquivoAtivo()) {
    todas = guardarHistorico(platform, clubId, todas);
  }

  const alvo = String(matchId);
  return { partida: todas.find((m) => m.matchId === alvo) || null, todas };
}

/** Converts a club's block of players within a match. */
function mapPlayers(raw) {
  return Object.entries(raw || {})
    .map(([id, p]) => ({
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
      minutos: Math.round(num(p.secondsPlayed) / 60),
    }))
    .sort((a, b) => b.rating - a.rating);
}

function normalizeMatch(match, clubId, matchType, completo = false) {
  const clubs = match.clubs || {};
  const mine = clubs[clubId];
  const opponentId = Object.keys(clubs).find((id) => id !== clubId);
  const opponent = opponentId ? clubs[opponentId] : null;
  if (!mine) return null;

  const goalsFor = num(mine.goals);
  const goalsAgainst = num(mine.goalsAgainst);
  const players = mapPlayers(match.players && match.players[clubId]);

  const base = {
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
    players,
  };

  if (!completo) return base;

  return {
    ...base,
    clube: {
      clubId: String(clubId),
      name: fixText(mine.details?.name || `Clube ${clubId}`),
      customKit: mine.details?.customKit || null,
    },
    opponentPlayers: opponentId ? mapPlayers(match.players && match.players[opponentId]) : [],
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
