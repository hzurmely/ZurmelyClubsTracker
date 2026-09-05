/**
 * Ponte para a API de Pro Clubs da EA, rodando em um Cloudflare Worker.
 *
 * Por que isto existe: a EA responde "Access Denied" para requisicoes vindas
 * das faixas de IP da Vercel (confirmado: 403 do edge da Akamai em menos de
 * 100ms, com qualquer conjunto de cabecalhos). O site em si continua na Vercel;
 * so a busca dos dados passa por aqui, de outra faixa de IP.
 *
 * O worker aceita apenas os caminhos da lista abaixo e repassa a query string
 * intacta. Nao recebe nem guarda nada do usuario.
 */

const ORIGEM = 'https://proclubs.ea.com';

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

function json(dados, status = 200, extra = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'GET') return json({ erro: 'Use GET.' }, 405);

    const url = new URL(request.url);

    // Uma rota de saude, para conferir rapidamente se o worker esta de pe.
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, servico: 'ponte EA Pro Clubs', rotas: [...ROTAS_PERMITIDAS] });
    }

    if (!ROTAS_PERMITIDAS.has(url.pathname)) {
      return json({ erro: 'Rota nao permitida por esta ponte.', rota: url.pathname }, 404);
    }

    const alvo = ORIGEM + url.pathname + url.search;

    let upstream;
    try {
      upstream = await fetch(alvo, {
        headers: CABECALHOS,
        // Cache na borda da Cloudflare: evita bater na EA a cada visita.
        cf: { cacheTtl: 60, cacheEverything: true },
      });
    } catch (err) {
      return json({ erro: 'Nao consegui falar com a EA.', detalhe: String(err) }, 502);
    }

    const corpo = await upstream.text();

    if (!upstream.ok) {
      return json(
        { erro: 'A EA recusou.', status: upstream.status, amostra: corpo.slice(0, 200) },
        upstream.status === 403 ? 502 : upstream.status,
      );
    }

    return new Response(corpo, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=60',
        ...CORS,
      },
    });
  },
};
