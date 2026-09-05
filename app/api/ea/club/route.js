import { NextResponse } from 'next/server';
import { getClubDossier } from '@/lib/dossier';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'common-gen5';
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta o parâmetro id' }, { status: 400 });
  }

  const dossier = await getClubDossier(platform, id);
  if (dossier.error && !dossier.info) {
    return NextResponse.json(dossier, { status: 502 });
  }
  return NextResponse.json(dossier);
}
