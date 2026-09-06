import Link from 'next/link';
import ClubHeader from '@/components/ClubHeader';
import StatCards, { FormStrip, Leaders } from '@/components/StatCards';
import PlayersTable from '@/components/PlayersTable';
import BestEleven from '@/components/BestEleven';
import Leaderboards from '@/components/Leaderboards';
import MatchList from '@/components/MatchList';
import SearchBar from '@/components/SearchBar';
import { getClubDossier, summarize } from '@/lib/dossier';
import { currentDictionary } from '@/lib/i18n/server';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { platform, id } = await params;
  try {
    const d = await getClubDossier(platform, id);
    return { title: d.info?.name || `Club ${id}` };
  } catch {
    return { title: `Club ${id}` };
  }
}

export default async function ClubPage({ params }) {
  const { platform, id } = await params;
  const dic = await currentDictionary();
  const dossier = await getClubDossier(platform, id);

  if (!dossier.info) {
    return (
      <section className="block">
        <div className="wrap stack" style={{ gap: 24 }}>
          <div className="banner err">
            <span>⚠️</span>
            <span>
              {dic.club.notFoundA} <strong>#{id}</strong> {dic.club.notFoundB}{' '}
              <strong>{platform}</strong>. {dossier.error}
            </span>
          </div>
          <p style={{ color: 'var(--muted)' }}>{dic.club.notFoundHelp}</p>
          <SearchBar autoFocus />
          <Link href="/" className="btn ghost" style={{ alignSelf: 'flex-start' }}>
            {dic.common.backHome}
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
            <span>{dic.club.demo}</span>
          </div>
        )}

        <ClubHeader
          info={dossier.info}
          overall={dossier.overall}
          summary={summary}
          platform={platform}
          dic={dic}
        />

        {dossier.overall ? (
          <StatCards overall={dossier.overall} summary={summary} dic={dic} />
        ) : (
          <div className="banner err">
            <span>⚠️</span>
            <span>{dic.club.statsMissing}</span>
          </div>
        )}

        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">{dic.club.recentForm}</div>
          <FormStrip form={summary.form} dic={dic} />
        </div>

        <Leaders summary={summary} dic={dic} />

        <BestEleven members={dossier.members} platform={platform} clubId={id} />

        <Leaderboards members={dossier.members} platform={platform} clubId={id} />

        <div className="stack" style={{ gap: 12 }}>
          <div className="row spread row-wrap">
            <div className="panel-title" style={{ margin: 0 }}>
              {dic.club.squad(dossier.members.length)}
            </div>
            <Link
              href={`/comparar?a=${platform}:${id}`}
              className="btn ghost"
              style={{ padding: '8px 16px' }}
            >
              {dic.club.compareWith}
            </Link>
          </div>
          <PlayersTable members={dossier.members} platform={platform} clubId={id} />
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">{dic.club.lastMatches}</div>
          <MatchList
            matches={dossier.matches}
            platform={platform}
            clubId={id}
            dic={dic}
          />
        </div>
      </div>
    </section>
  );
}
