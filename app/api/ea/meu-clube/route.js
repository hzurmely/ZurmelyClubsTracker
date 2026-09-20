import { NextResponse } from 'next/server';
import { getClubDossier, summarize } from '@/lib/dossier';

export const dynamic = 'force-dynamic';

/**
 * A trimmed down dossier, carrying only what the "My club" card on the home
 * page shows. It exists so that card does not have to download the whole squad
 * and match history.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'common-gen5';
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ erro: 'Falta o parâmetro id' }, { status: 400 });
  }

  const dossier = await getClubDossier(platform, id);
  if (!dossier.info) {
    // sumiu tells the card the club is gone for good, so it offers to forget it
    // instead of a "try again" that can never work.
    return NextResponse.json(
      { erro: dossier.error || 'Clube não encontrado', sumiu: !!dossier.sumiu },
      { status: 502 },
    );
  }

  const resumo = summarize(dossier);

  return NextResponse.json({
    id: String(id),
    platform,
    name: dossier.info.name,
    customKit: dossier.info.customKit || null,
    gamesPlayed: dossier.overall?.gamesPlayed ?? 0,
    aproveitamento: resumo.aproveitamento,
    golsPorJogo: resumo.golsPorJogo,
    form: (resumo.form || []).slice(0, 6),
    demo: !!dossier.demo,
  });
}
