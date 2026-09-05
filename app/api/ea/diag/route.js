import { NextResponse } from 'next/server';
import { HEADER_VARIANTS, buildUrl, rawFetch } from '@/lib/ea';

export const dynamic = 'force-dynamic';

// Teste: a EA bloqueia faixas de IP de datacenter. iad1 (Virginia, AWS) leva 403.
// Aqui pedimos que a função rode em gru1 (São Paulo) para ver se aquela faixa passa.
export const preferredRegion = 'gru1';

/**
 * Diagnóstico. Bate na EA com cada conjunto de cabeçalhos e conta o que voltou.
 * Serve para responder rápido a pergunta que sempre aparece quando o site para:
 * "a EA está fora do ar, ou é este servidor que está sendo bloqueado?".
 *
 * Abra /api/ea/diag no navegador. Não expõe nada sensível, só status HTTP.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'common-gen5';
  const clubName = searchParams.get('q') || 'elite';

  const url = buildUrl('/allTimeLeaderboard/search', { platform, clubName });

  const results = [];
  for (let i = 0; i < HEADER_VARIANTS.length; i += 1) {
    const started = Date.now();
    try {
      const r = await rawFetch(url, i, 0);
      let itens = null;
      try {
        const parsed = JSON.parse(r.text);
        itens = Array.isArray(parsed) ? parsed.length : null;
      } catch {
        itens = null;
      }
      results.push({
        variante: HEADER_VARIANTS[i].id,
        status: r.status,
        ms: Date.now() - started,
        itens,
        amostra: r.text.slice(0, 120),
      });
    } catch (err) {
      results.push({
        variante: HEADER_VARIANTS[i].id,
        erro: String(err?.message || err),
        ms: Date.now() - started,
      });
    }
  }

  const ok = results.find((r) => r.status === 200);

  return NextResponse.json({
    url,
    regiao: process.env.VERCEL_REGION || 'local',
    veredito: ok
      ? `Funcionando com a variante "${ok.variante}".`
      : 'Nenhuma variante passou. Ou a EA está fora, ou este servidor está bloqueado.',
    resultados: results,
  });
}
