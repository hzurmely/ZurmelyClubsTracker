import { NextResponse } from 'next/server';
import { getClubDossier, summarize } from '@/lib/dossier';

export const dynamic = 'force-dynamic';

/**
 * Versão enxuta do dossiê, só com o que o cartão "Meu clube" da home mostra.
 * Existe para o cartão não precisar baixar o elenco inteiro e o histórico.
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
    return NextResponse.json({ erro: dossier.error || 'Clube não encontrado' }, { status: 502 });
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
