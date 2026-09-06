import Link from 'next/link';
import ClubHeader from '@/components/ClubHeader';
import StatCards, { FormStrip, Leaders } from '@/components/StatCards';
import PlayersTable from '@/components/PlayersTable';
import BestEleven from '@/components/BestEleven';
import Leaderboards from '@/components/Leaderboards';
import MatchList from '@/components/MatchList';
import SearchBar from '@/components/SearchBar';
import { getClubDossier, summarize } from '@/lib/dossier';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { platform, id } = await params;
  try {
    const d = await getClubDossier(platform, id);
    return { title: d.info?.name || `Clube ${id}` };
  } catch {
    return { title: `Clube ${id}` };
  }
}

export default async function ClubPage({ params }) {
  const { platform, id } = await params;
  const dossier = await getClubDossier(platform, id);

  if (!dossier.info) {
    return (
      <section className="block">
        <div className="wrap stack" style={{ gap: 24 }}>
          <div className="banner err">
            <span>⚠️</span>
            <span>
              Não consegui carregar o clube <strong>#{id}</strong> em{' '}
              <strong>{platform}</strong>. {dossier.error}
            </span>
          </div>
          <p style={{ color: 'var(--muted)' }}>
            Duas causas comuns: o clube está em outra plataforma, ou a API da EA está
            instável no momento. Tente buscar de novo:
          </p>
          <SearchBar autoFocus />
          <Link href="/" className="btn ghost" style={{ alignSelf: 'flex-start' }}>
            Voltar para a home
          </Link>
        </div>
      </section>
    );
  }

  const summary = summarize(dossier);

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 26 }}>
        {dossier.demo && (
          <div className="banner">
            <span>🧪</span>
            <span>
              Modo demonstração ligado (<code>EA_DEMO=1</code>). Estes números são
              fictícios, só para você ver o layout. Coloque <code>EA_DEMO=0</code> no{' '}
              <code>.env.local</code> para usar dados reais da EA.
            </span>
          </div>
        )}

        <ClubHeader
          info={dossier.info}
          overall={dossier.overall}
          summary={summary}
          platform={platform}
        />

        {dossier.overall ? (
          <StatCards overall={dossier.overall} summary={summary} />
        ) : (
          <div className="banner err">
            <span>⚠️</span>
            <span>As estatísticas gerais não vieram da EA nesta consulta.</span>
          </div>
        )}

        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">Forma recente</div>
          <FormStrip form={summary.form} />
        </div>

        <Leaders summary={summary} />

        <BestEleven members={dossier.members} platform={platform} clubId={id} />

        <Leaderboards members={dossier.members} platform={platform} clubId={id} />

        <div className="stack" style={{ gap: 12 }}>
          <div className="row spread row-wrap">
            <div className="panel-title" style={{ margin: 0 }}>
              Elenco · {dossier.members.length} jogadores
            </div>
            <Link
              href={`/comparar?a=${platform}:${id}`}
              className="btn ghost"
              style={{ padding: '8px 16px' }}
            >
              Comparar com outro clube
            </Link>
          </div>
          <PlayersTable members={dossier.members} platform={platform} clubId={id} />
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">Últimas partidas</div>
          <MatchList matches={dossier.matches} platform={platform} clubId={id} />
        </div>
      </div>
    </section>
  );
}
