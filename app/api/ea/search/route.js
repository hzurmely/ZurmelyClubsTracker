import { NextResponse } from 'next/server';
import { searchClubs, isDemo } from '@/lib/ea';
import { demo } from '@/lib/demo';
import { PLATFORMS } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const platform = searchParams.get('platform') || '';

  if (q.length < 2) {
    return NextResponse.json({ results: [], demo: isDemo() });
  }

  // Quais pools consultar. Sem plataforma definida, varremos todas em paralelo
  // (e assim o usuário acha o clube mesmo sem saber o console).
  const pools = platform ? [platform] : PLATFORMS.map((p) => p.id);

  if (isDemo()) {
    const results = pools.flatMap((p) => demo.search(p, q));
    return NextResponse.json({ results, demo: true });
  }

  const settled = await Promise.allSettled(pools.map((p) => searchClubs(p, q)));

  const results = [];
  const errors = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') results.push(...r.value);
    else errors.push(`${pools[i]}: ${r.reason?.message || 'falhou'}`);
  });

  if (!results.length && errors.length === pools.length) {
    return NextResponse.json(
      { results: [], error: 'A API da EA não respondeu agora. Tente de novo em instantes.', details: errors },
      { status: 502 },
    );
  }

  // Clubes com mais jogos primeiro: normalmente é o que a pessoa procura.
  results.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return NextResponse.json({ results: results.slice(0, 40), demo: false });
}
