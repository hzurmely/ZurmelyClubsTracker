import { NextResponse } from 'next/server';
import { HEADER_VARIANTS, buildUrl, rawFetch } from '@/lib/ea';

export const dynamic = 'force-dynamic';

// Note: changing the function region does not help. EA blocks datacenter IP
// ranges in general, not one specific region, and the Vercel Hobby plan does not
// even honour preferredRegion. What saves the day is the reader detour, tested
// below.

/**
 * Diagnostics. Hits EA with each header set, reports what came back and then
 * tests the public reader detour. It exists to quickly answer the question that
 * always shows up when the site stops: "is EA down, or is this server being
 * blocked?".
 *
 * Any endpoint can be aimed at, which is what makes it useful when one call
 * disagrees with the others:
 *
 *   /api/ea/diag
 *   /api/ea/diag?path=/clubs/info&clubIds=8485566
 *   /api/ea/diag?path=/clubs/matches&clubIds=8485566&matchType=leagueMatch
 *
 * The reader is tried twice, once plainly and once with a throwaway parameter
 * on the end of the EA address. If those two disagree, something between here
 * and EA is answering from a copy it kept.
 *
 * It exposes nothing sensitive, only HTTP statuses and the first line of each
 * answer.
 */
const CAMINHOS = new Set([
  '/allTimeLeaderboard/search',
  '/clubs/info',
  '/clubs/overallStats',
  '/clubs/matches',
  '/members/stats',
  '/members/career/stats',
]);

const PARAMETROS = ['platform', 'clubIds', 'clubId', 'clubName', 'matchType', 'maxResultCount'];

const EA_DIRETO = 'https://proclubs.ea.com/api/fc';

function resumo(texto) {
  let itens = null;
  try {
    const parsed = JSON.parse(texto);
    if (Array.isArray(parsed)) itens = parsed.length;
    else if (parsed && typeof parsed === 'object') itens = Object.keys(parsed).length;
  } catch {
    itens = null;
  }
  return { itens, amostra: texto.slice(0, 120) };
}

async function pelaLeitura(alvo) {
  const inicio = Date.now();
  try {
    const r = await fetch('https://r.jina.ai/' + alvo, {
      headers: { 'x-return-format': 'text', 'x-no-cache': 'true' },
      cache: 'no-store',
    });
    const texto = await r.text();
    return { status: r.status, ms: Date.now() - inicio, ...resumo(texto) };
  } catch (err) {
    return { erro: String(err?.message || err), ms: Date.now() - inicio };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const pedido = searchParams.get('path') || '/allTimeLeaderboard/search';
  const path = CAMINHOS.has(pedido) ? pedido : '/allTimeLeaderboard/search';

  const params = { platform: searchParams.get('platform') || 'common-gen5' };
  for (const nome of PARAMETROS) {
    const valor = searchParams.get(nome);
    if (valor) params[nome] = valor;
  }
  if (path === '/allTimeLeaderboard/search' && !params.clubName) {
    params.clubName = searchParams.get('q') || 'elite';
  }

  const url = buildUrl(path, params);

  const resultados = [];
  for (let i = 0; i < HEADER_VARIANTS.length; i += 1) {
    const inicio = Date.now();
    try {
      const r = await rawFetch(url, i);
      resultados.push({
        variante: HEADER_VARIANTS[i].id,
        status: r.status,
        ms: Date.now() - inicio,
        ...resumo(r.text),
      });
    } catch (err) {
      resultados.push({
        variante: HEADER_VARIANTS[i].id,
        erro: String(err?.message || err),
        ms: Date.now() - inicio,
      });
    }
  }

  const direto = resultados.find((r) => r.status === 200);

  const alvo = buildUrl(path, params, EA_DIRETO);
  const alvoUnico = buildUrl(path, { ...params, _: Date.now() }, EA_DIRETO);

  const leitor = await pelaLeitura(alvo);
  const leitorUnico = await pelaLeitura(alvoUnico);

  const guardado =
    leitor.amostra !== undefined &&
    leitorUnico.amostra !== undefined &&
    leitor.amostra !== leitorUnico.amostra;

  let veredito;
  if (direto) {
    veredito = 'Direct path works, with the "' + direto.variante + '" header set.';
  } else if (guardado) {
    veredito =
      'The reader answers, but the plain address and the unique one disagree: something in between is replaying a copy it kept. The unique address is the one to trust.';
  } else if (leitor.itens) {
    veredito = 'EA blocks this server IP, the reader detour works. The site is up.';
  } else {
    veredito = 'Neither path got through. Either EA is down or the reader is unavailable.';
  }

  return NextResponse.json({
    url,
    regiao: process.env.VERCEL_REGION || 'local',
    veredito,
    guardado,
    direto: resultados,
    leitor,
    leitorUnico,
  });
}
