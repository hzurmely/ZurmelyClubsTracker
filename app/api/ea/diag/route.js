import { NextResponse } from 'next/server';
import { HEADER_VARIANTS, buildUrl, rawFetch } from '@/lib/ea';

export const dynamic = 'force-dynamic';

// Nota: trocar a regiao da funcao nao resolve. A EA bloqueia as faixas de IP de
// datacenter em geral, nao uma regiao especifica, e o plano Hobby da Vercel nem
// respeita preferredRegion. Quem salva e o desvio pelo leitor, testado abaixo.

/**
 * Diagnostico. Bate na EA com cada conjunto de cabecalhos, conta o que voltou e
 * depois testa o desvio pelo leitor publico. Serve para responder rapido a
 * pergunta que sempre aparece quando o site para: "a EA esta fora do ar, ou e
 * este servidor que esta sendo bloqueado?".
 *
 * Abra /api/ea/diag no navegador. Nao expoe nada sensivel, so status HTTP.
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

  // O desvio: o mesmo pedido pelo leitor publico, que sai por outra faixa de IP.
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
