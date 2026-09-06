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

  // Which pools to query. With no platform set we sweep all of them in
  // parallel, so the club turns up even when nobody remembers the console.
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

  // Clubs with more games first: usually that is the one being looked for.
  results.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return NextResponse.json({ results: results.slice(0, 40), demo: false });
}
