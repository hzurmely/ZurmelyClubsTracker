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
 * Open /api/ea/diag in a browser. It exposes nothing sensitive, only HTTP
 * statuses.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'common-gen5';
  const clubName = searchParams.get('q') || 'elite';

  const url = buildUrl('/allTimeLeaderboard/search', { platform, clubName });

  const resultados = [];
  for (let i = 0; i < HEADER_VARIANTS.length; i += 1) {
    const inicio = Date.now();
    try {
      const r = await rawFetch(url, i, 0);
      let itens = null;
      try {
        const parsed = JSON.parse(r.text);
        itens = Array.isArray(parsed) ? parsed.length : null;
      } catch {
        itens = null;
      }
      resultados.push({
        variante: HEADER_VARIANTS[i].id,
        status: r.status,
        ms: Date.now() - inicio,
        itens,
        amostra: r.text.slice(0, 120),
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

  // The detour: the same request through the public reader, which leaves from a
  // different IP range.
  const leitor = { testado: false };
  if (!direto) {
    const inicio = Date.now();
    leitor.testado = true;
    try {
      const alvo =
        'https://r.jina.ai/https://proclubs.ea.com/api/fc/allTimeLeaderboard/search' +
        '?platform=' + encodeURIComponent(platform) +
        '&clubName=' + encodeURIComponent(clubName);
      const r = await fetch(alvo, {
        headers: { 'x-return-format': 'text' },
        cache: 'no-store',
      });
      const texto = await r.text();
      let itens = null;
      try {
        const parsed = JSON.parse(texto);
        itens = Array.isArray(parsed) ? parsed.length : null;
      } catch {
        itens = null;
      }
      leitor.status = r.status;
      leitor.ms = Date.now() - inicio;
      leitor.itens = itens;
      leitor.amostra = texto.slice(0, 120);
    } catch (err) {
      leitor.erro = String(err?.message || err);
      leitor.ms = Date.now() - inicio;
    }
  }

  let veredito;
  if (direto) {
    veredito = 'Funcionando direto, com a variante "' + direto.variante + '".';
  } else if (leitor.itens) {
    veredito =
      'A EA esta bloqueando o IP deste servidor, mas o desvio pelo leitor esta funcionando. O site continua de pe.';
  } else {
    veredito =
      'Nem o caminho direto nem o desvio passaram. Ou a EA esta fora, ou o leitor esta indisponivel.';
  }

  return NextResponse.json({
    url,
    regiao: process.env.VERCEL_REGION || 'local',
    veredito,
    direto: resultados,
    leitor,
  });
}
