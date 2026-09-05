import Link from 'next/link';
import Crest from '@/components/Crest';
import { timeAgo, dec, posLabel } from '@/lib/format';

export default function MatchList({ matches, platform }) {
  if (!matches?.length) {
    return (
      <div className="panel pad" style={{ color: 'var(--muted)' }}>
        Nenhuma partida recente encontrada. A EA guarda só as últimas partidas de
        liga e playoff, então clubes parados aparecem vazios aqui.
      </div>
    );
  }

  return (
    <div className="panel">
      {matches.map((m) => (
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
                  {m.matchType ? <span className="mtype">{m.matchType}</span> : null}
                </span>
              </span>
              <span className="right" style={{ textAlign: 'right' }}>
                <div className="score">
                  {m.goalsFor} <span style={{ color: 'var(--dim)' }}>x</span>{' '}
                  {m.goalsAgainst}
                </div>
                <div className="when">ver escalação</div>
              </span>
            </div>
          </summary>

          <div style={{ padding: '0 16px 16px' }}>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Pos</th>
                  <th>G</th>
                  <th>A</th>
                  <th>Fin</th>
                  <th>Passes</th>
                  <th>Desarmes</th>
                  <th>Defesas</th>
                  <th>Nota</th>
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
                    <td>{dec(p.rating, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}
