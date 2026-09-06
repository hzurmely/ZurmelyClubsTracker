'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ordenarElenco } from '@/lib/partida';
import { posLabel, posGroup, dec, pct } from '@/lib/format';

function classeNota(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

function Tabela({ jogadores, platform, clubId }) {
  const linhas = ordenarElenco(jogadores);

  if (!linhas.length) {
    return (
      <div className="panel pad" style={{ color: 'var(--muted)' }}>
        A EA não devolveu as linhas deste time nesta partida.
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            <th>Jogador</th>
            <th title="Nota da partida">Nota</th>
            <th title="Gols">G</th>
            <th title="Assistências">A</th>
            <th title="Finalizações">Chutes</th>
            <th title="Passes certos sobre tentados">Passe</th>
            <th title="Desarmes certos sobre tentados">Desarme</th>
            <th title="Defesas do goleiro">Defesas</th>
            <th title="Craque do jogo">Craque</th>
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
                <span className={`rating ${classeNota(p.rating)}`}>{dec(p.rating, 2)}</span>
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
 * Os dois elencos da partida. Fica em abas porque duas tabelas empilhadas viram
 * uma rolagem enorme no celular, e a graça é comparar um lado com o outro.
 */
export default function ElencosPartida({ meu, dele, platform }) {
  const [lado, setLado] = useState('meu');
  const time = lado === 'meu' ? meu : dele;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row spread row-wrap">
        <div className="panel-title" style={{ margin: 0 }}>
          Como cada um jogou
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

      {/* O nome leva para o DNA do jogador dentro do clube dele. Quem já saiu do
          clube cai numa página que explica isso, em vez de num perfil vazio. */}
      <Tabela jogadores={time.jogadores} platform={platform} clubId={time.clubId} />
    </div>
  );
}
