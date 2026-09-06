import Link from 'next/link';
import DnaAtleta from '@/components/DnaAtleta';
import { getClubDossier } from '@/lib/dossier';
import { perfilDoJogador } from '@/lib/dna';
import { currentDictionary } from '@/lib/i18n/server';
import { initials, posLabel, posGroup } from '@/lib/format';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { platform, id, nome } = await params;
  const jogador = decodeURIComponent(nome);
  try {
    const d = await getClubDossier(platform, id);
    return { title: `${jogador} · ${d.info?.name || `Club ${id}`}` };
  } catch {
    return { title: jogador };
  }
}

export default async function JogadorPage({ params }) {
  const { platform, id, nome } = await params;
  const alvo = decodeURIComponent(nome);
  const dic = await currentDictionary();
  const dossier = await getClubDossier(platform, id);

  const base = perfilDoJogador({
    members: dossier.members,
    matches: dossier.matches,
    nome: alvo,
    modo: 'season',
    dic,
  });

  if (!base) {
    return (
      <section className="block">
        <div className="wrap stack" style={{ gap: 20 }}>
          <div className="banner err">
            <span>⚠️</span>
            <span>
              {dic.dna.notFoundA} <strong>{alvo}</strong> {dic.dna.notFoundB}{' '}
              <strong>{dossier.info?.name || `#${id}`}</strong>. {dic.dna.notFoundHelp}
            </span>
          </div>
          <Link href={`/clube/${platform}/${id}`} className="btn ghost" style={{ alignSelf: 'flex-start' }}>
            {dic.common.backClub}
          </Link>
        </div>
      </section>
    );
  }

  const carreira = perfilDoJogador({
    members: dossier.members,
    matches: dossier.matches,
    nome: alvo,
    modo: 'career',
    dic,
  });

  // The radar and the history are the same in both views. Only the stats and
  // the medals change, so that is the only thing duplicated on the way to the
  // browser.
  const perfil = {
    jogador: base.jogador,
    temTemporada: base.temTemporada,
    temCarreira: base.temCarreira,
    temRadar: base.temRadar,
    eixos: base.eixos,
    arquetipo: base.arquetipo,
    partidas: base.partidas,
    resumo: base.resumo,
    elenco: base.elenco,
    recortes: {
      season: { stats: base.season, medalhas: base.medalhas },
      career: { stats: carreira.career, medalhas: carreira.medalhas },
    },
  };

  const companheiros = (dossier.members || [])
    .filter((m) => m.name !== alvo)
    .sort((a, b) => (b.season?.rating || b.career?.rating || 0) - (a.season?.rating || a.career?.rating || 0))
    .slice(0, 10);

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 26 }}>
        <Link href={`/clube/${platform}/${id}`} className="voltar">
          ← {dossier.info?.name || `#${id}`}
        </Link>

        <DnaAtleta
          perfil={perfil}
          platform={platform}
          clubId={id}
          clubName={dossier.info?.name || `#${id}`}
        />

        {companheiros.length > 0 && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="panel-title">{dic.dna.teammates}</div>
            <div className="colegas">
              {companheiros.map((m) => (
                <Link
                  key={m.name}
                  href={`/clube/${platform}/${id}/jogador/${encodeURIComponent(m.name)}`}
                  className="colega"
                >
                  <span className={`colega-ini ${posGroup(m.pos)}`}>{initials(m.name)}</span>
                  <span className="grow">
                    <b>{m.name}</b>
                    <i>{posLabel(m.pos)}</i>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
