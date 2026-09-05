export const dynamic = 'force-dynamic';

/**
 * Teste temporario: a Vercel consegue falar com o leitor r.jina.ai?
 * Se sim, o leitor vira a saida de emergencia do lib/ea.js quando a EA
 * bloqueia o IP do servidor. Pode apagar esta rota depois.
 */
export async function GET() {
  const alvo =
    'https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?platform=common-gen5&clubName=elite';
  const inicio = Date.now();
  try {
    const r = await fetch('https://r.jina.ai/' + alvo, {
      headers: { 'x-return-format': 'text' },
      cache: 'no-store',
    });
    const t = await r.text();
    return Response.json({
      status: r.status,
      ms: Date.now() - inicio,
      tamanho: t.length,
      ehJson: t.trimStart().startsWith('['),
      amostra: t.slice(0, 200),
    });
  } catch (e) {
    return Response.json({ erro: String(e), ms: Date.now() - inicio }, { status: 502 });
  }
}
