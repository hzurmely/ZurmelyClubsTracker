'use client';

import { useState } from 'react';
import Link from 'next/link';
import Crest from '@/components/Crest';
import { useDic } from '@/components/I18nProvider';
import { timeAgo, dec, posLabel } from '@/lib/format';

/** How many matches appear at once, and how many each "show more" adds. */
const PASSO = 15;

/**
 * Recent matches.
 *
 * On the site this is the twenty matches EA still publishes. In the desktop
 * program the local archive can hold hundreds, so the list opens in chunks:
 * every row carries a full lineup table inside, and rendering six hundred of
 * those at once would freeze the page for no benefit.
 */
export default function MatchList({ matches, platform, clubId, arquivadas = 0 }) {
  const dic = useDic();
  const [visiveis, setVisiveis] = useState(PASSO);

  if (!matches?.length) {
    return (
      <div className="panel pad" style={{ color: 'var(--muted)' }}>
        {dic.matches.empty}
      </div>
    );
  }

  const mostradas = matches.slice(0, visiveis);
  const faltam = matches.length - mostradas.length;

  return (
    <>
    <div className="panel">
      {mostradas.map((m) => (
        <details className="mdetail" key={m.matchId}>
          <summary>
            <div className="match">
              <span className={`pill ${m.result}`}>{m.result}</span>
              <span className="grow">
                <span className="row" style={{ gap: 10 }}>
                  <Crest club={m.opponent} size={26} radius={8} />
                  <span className="opp">
                    {m.opponent.clubId ? (
                      <Link href={`/clube/${platform}/${m.opponent.clubId}`}>
                        {m.opponent.name}
                      </Link>
                    ) : (
                      m.opponent.name
                    )}
                  </span>
                </span>
                <span className="when">
                  {timeAgo(m.timestamp)}
                  {m.matchType ? (
                    <span className="mtype">
                      {m.matchType === 'Playoff' ? dic.matches.playoff : dic.matches.league}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="right" style={{ textAlign: 'right' }}>
                <div className="score">
                  {m.goalsFor} <span style={{ color: 'var(--dim)' }}>x</span>{' '}
                  {m.goalsAgainst}
                </div>
                <div className="when">{dic.matches.seeLineup}</div>
              </span>
            </div>
          </summary>

          <div style={{ padding: '0 16px 16px' }}>
            {clubId ? (
              <div className="row" style={{ justifyContent: 'flex-end', paddingBottom: 10 }}>
                <Link
                  href={`/clube/${platform}/${clubId}/partida/${m.matchId}`}
                  className="btn ghost"
                  style={{ padding: '7px 14px', fontSize: 13 }}
                >
                  {dic.matches.fullAnalysis}
                </Link>
              </div>
            ) : null}
            <table className="mini-table">
              <thead>
                <tr>
                  <th>{dic.matches.cols.player}</th>
                  <th>{dic.matches.cols.pos}</th>
                  <th>{dic.matches.cols.goals}</th>
                  <th>{dic.matches.cols.assists}</th>
                  <th>{dic.matches.cols.shots}</th>
                  <th>{dic.matches.cols.passes}</th>
                  <th>{dic.matches.cols.tackles}</th>
                  <th>{dic.matches.cols.saves}</th>
                  <th>{dic.matches.cols.rating}</th>
                </tr>
              </thead>
              <tbody>
                {m.players.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.name} {p.mom ? '⭐' : ''}
                    </td>
                    <td>{posLabel(p.pos)}</td>
                    <td>{p.goals}</td>
                    <td>{p.assists}</td>
                    <td>{p.shots}</td>
                    <td>
                      {p.passesMade}
                      <span style={{ color: 'var(--dim)' }}>/{p.passAttempts}</span>
                    </td>
                    <td>{p.tacklesMade}</td>
                    <td>{p.saves}</td>
                    <td>{dec(p.rating, 1, dic)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>

    {(faltam > 0 || arquivadas > matches.length) && (
      <div className="row row-wrap" style={{ gap: 12, justifyContent: 'center', paddingTop: 12 }}>
        {faltam > 0 && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => setVisiveis((v) => v + PASSO)}
          >
            {dic.matches.showMore(Math.min(faltam, PASSO))}
          </button>
        )}
        <span style={{ color: 'var(--dim)', fontSize: 13 }}>
          {dic.matches.counter(mostradas.length, matches.length)}
        </span>
      </div>
    )}
    </>
  );
}
