'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ordenarElenco } from '@/lib/partida';
import { useDic } from '@/components/I18nProvider';
import { posLabel, posGroup, dec, pct } from '@/lib/format';

function classeNota(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

function Tabela({ jogadores, platform, clubId, dic }) {
  const linhas = ordenarElenco(jogadores);

  if (!linhas.length) {
    return (
      <div className="panel pad" style={{ color: 'var(--muted)' }}>
        {dic.match.squadEmpty}
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            <th>{dic.match.squadCols.player}</th>
            <th title={dic.match.squadCols.ratingHint}>{dic.match.squadCols.rating}</th>
            <th title={dic.squad.cols.goalsHint}>{dic.match.squadCols.goals}</th>
            <th title={dic.squad.cols.assistsHint}>{dic.match.squadCols.assists}</th>
            <th>{dic.match.squadCols.shots}</th>
            <th title={dic.match.squadCols.passHint}>{dic.match.squadCols.pass}</th>
            <th title={dic.match.squadCols.tackleHint}>{dic.match.squadCols.tackle}</th>
            <th title={dic.match.squadCols.savesHint}>{dic.match.squadCols.saves}</th>
            <th title={dic.match.squadCols.momHint}>{dic.match.squadCols.mom}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((p) => (
            <tr key={p.id || p.name}>
              <td>
                <span className="player-cell">
                  <span className={`poschip ${posGroup(p.pos)}`}>{posLabel(p.pos)}</span>
                  {clubId ? (
                    <Link
                      href={`/clube/${platform}/${clubId}/jogador/${encodeURIComponent(p.name)}`}
                      className="link-jogador"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 620 }}>{p.name}</span>
                  )}
                </span>
              </td>
              <td>
                <span className={`rating ${classeNota(p.rating)}`}>{dec(p.rating, 2, dic)}</span>
              </td>
              <td>{p.goals}</td>
              <td>{p.assists}</td>
              <td>{p.shots}</td>
              <td>
                {p.passesMade}
                <span style={{ color: 'var(--dim)' }}>/{p.passAttempts}</span>
                {p.passAttempts ? (
                  <span style={{ color: 'var(--dim)' }}>
                    {' '}
                    · {pct((p.passesMade / p.passAttempts) * 100)}
                  </span>
                ) : null}
              </td>
              <td>
                {p.tacklesMade}
                <span style={{ color: 'var(--dim)' }}>/{p.tackleAttempts}</span>
              </td>
              <td>{p.saves || ''}</td>
              <td>{p.mom ? '⭐' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Both squads from the match. It sits in tabs because two stacked tables turn
 * into an enormous scroll on a phone, and the point is comparing one side with
 * the other.
 */
export default function ElencosPartida({ meu, dele, platform }) {
  const dic = useDic();
  const [lado, setLado] = useState('meu');
  const time = lado === 'meu' ? meu : dele;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row spread row-wrap">
        <div className="panel-title" style={{ margin: 0 }}>
          {dic.match.squadsTitle}
        </div>
        <div className="tabs">
          <button className={`tab ${lado === 'meu' ? 'on' : ''}`} onClick={() => setLado('meu')}>
            {meu.nome}
          </button>
          <button className={`tab ${lado === 'dele' ? 'on' : ''}`} onClick={() => setLado('dele')}>
            {dele.nome}
          </button>
        </div>
      </div>

      {/* The name leads to the player DNA inside his own club. Anyone who has
          already left lands on a page that explains it, not an empty profile. */}
      <Tabela jogadores={time.jogadores} platform={platform} clubId={time.clubId} dic={dic} />
    </div>
  );
}
