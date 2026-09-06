/**
 * Bridge to EA's Pro Clubs API, running on a Cloudflare Worker.
 *
 * Why this exists: EA answers "Access Denied" to requests coming from Vercel's
 * IP ranges AND from Cloudflare's ranges (a 403 from the Akamai edge in under
 * 100ms, with any set of headers). The site stays on Vercel; only the data
 * fetching goes through here.
 *
 * Strategy: try EA directly. If it gets a 403, repeat the request through the
 * public r.jina.ai reader, which goes out through an IP range EA accepts. The
 * result is the same JSON from EA, so the site does not need to know which way
 * it came.
 *
 * The worker accepts only the paths in the list below and forwards the query
 * string untouched. It neither receives nor stores anything from the user.
 */

const ORIGEM = 'https://proclubs.ea.com';
const LEITOR = 'https://r.jina.ai/';

const ROTAS_PERMITIDAS = new Set([
  '/api/fc/allTimeLeaderboard/search',
  '/api/fc/clubs/info',
  '/api/fc/clubs/overallStats',
  '/api/fc/clubs/matches',
  '/api/fc/members/stats',
  '/api/fc/members/career/stats',
]);

const CABECALHOS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-max-age': '86400',
};

const CACHE = { cacheTtl: 120, cacheEverything: true };

function json(dados, status = 200, extra = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}

async function tentar(url, headers) {
  const r = await fetch(url, { headers, cf: CACHE });
  return { status: r.status, corpo: await r.text() };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'GET') return json({ erro: 'Use GET.' }, 405);

    const url = new URL(request.url);

    // Health route, to quickly check whether the worker is up.
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, servico: 'ponte EA Pro Clubs', rotas: [...ROTAS_PERMITIDAS] });
    }

    if (!ROTAS_PERMITIDAS.has(url.pathname)) {
      return json({ erro: 'Route not allowed by this bridge.', rota: url.pathname }, 404);
    }

    const alvo = ORIGEM + url.pathname + url.search;

    let via = 'direto';
    let r;
    try {
      r = await tentar(alvo, CABECALHOS);
      if (r.status === 403 || r.status === 429) {
        via = 'leitor';
        r = await tentar(LEITOR + alvo, { ...CABECALHOS, 'x-return-format': 'text' });
      }
    } catch (err) {
      return json({ erro: 'Could not reach EA.', detalhe: String(err) }, 502);
    }

    // EA sometimes answers 200 with a block page. Check that it really is JSON.
    let dados = null;
    try {
      dados = JSON.parse(r.corpo);
    } catch {
      dados = null;
    }

    if (r.status !== 200 || dados === null) {
      return json(
        {
          erro: 'EA refused the request.',
          status: r.status,
          via,
          amostra: r.corpo.slice(0, 200),
        },
        502,
      );
    }

    return new Response(JSON.stringify(dados), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=120',
        'x-ponte-via': via,
        ...CORS,
      },
    });
  },
};
