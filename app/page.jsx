import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Crest from '@/components/Crest';
import { FormStrip } from '@/components/StatCards';
import MeuClube from '@/components/MeuClube';
import { SITE, MY_CLUB } from '@/lib/config';
import { getClubDossier, summarize } from '@/lib/dossier';
import { currentDictionary } from '@/lib/i18n/server';
import { nf, pct, dec } from '@/lib/format';

export const revalidate = 60;

export default async function Home() {
  const dic = await currentDictionary();

  let mine = null;
  if (MY_CLUB.id) {
    try {
      const dossier = await getClubDossier(MY_CLUB.platform, MY_CLUB.id);
      if (dossier.info) mine = { dossier, summary: summarize(dossier) };
    } catch {
      mine = null;
    }
  }

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow">{dic.home.eyebrow}</span>
          <h1>
            {dic.home.titleA}
            <br />
            <span className="grad">{dic.home.titleB}</span>
          </h1>
          <p className="lead">
            {SITE.tagline || dic.tagline}. {dic.home.lead}
          </p>
          <SearchBar autoFocus />
        </div>
      </section>

      {mine && (
        <section className="block">
          <div className="wrap stack">
            <div className="panel-title">{dic.myClub.title}</div>
            <Link
              href={`/clube/${MY_CLUB.platform}/${MY_CLUB.id}`}
              className="panel pad"
              style={{ display: 'block' }}
            >
              <div className="row row-wrap" style={{ gap: 20 }}>
                <Crest club={mine.dossier.info} size={72} radius={18} />
                <div className="grow stack" style={{ gap: 6 }}>
                  <h2 style={{ fontSize: 26 }}>{mine.dossier.info.name}</h2>
                  <div className="row row-wrap" style={{ gap: 16, color: 'var(--muted)' }}>
                    <span>
                      <strong style={{ color: 'var(--text)' }}>
                        {nf(mine.dossier.overall?.gamesPlayed, dic)}
                      </strong>{' '}
                      {dic.common.games}
                    </span>
                    <span>
                      {dic.common.winRate}{' '}
                      <strong style={{ color: 'var(--accent)' }}>
                        {pct(mine.summary.aproveitamento)}
                      </strong>
                    </span>
                    <span>
                      {dic.common.goalsAvg}{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        {dec(mine.summary.golsPorJogo, 2, dic)}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <span
                    className="lbl"
                    style={{
                      fontSize: 11,
                      letterSpacing: '.13em',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {dic.common.form}
                  </span>
                  <FormStrip form={mine.summary.form.slice(0, 6)} />
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {!MY_CLUB.id && <MeuClube />}

      <section className="block">
        <div className="wrap stack">
          <div className="panel-title">{dic.home.featuresTitle}</div>
          <div className="grid-3">
            {dic.home.features.map((f) => (
              <div className="feature" key={f.title}>
                <div className="ico">{f.ico}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
