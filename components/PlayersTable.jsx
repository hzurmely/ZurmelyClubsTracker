'use client';

import { useMemo, useState } from 'react';
import { posLabel, posGroup, dec, pct } from '@/lib/format';

const COLUMNS = [
  { key: 'name', label: 'Jogador', type: 'text' },
  { key: 'gamesPlayed', label: 'J', hint: 'Jogos' },
  { key: 'goals', label: 'G', hint: 'Gols' },
  { key: 'assists', label: 'A', hint: 'Assistências' },
  { key: 'ga', label: 'G+A', hint: 'Participações em gols' },
  { key: 'perGame', label: 'G+A/J', hint: 'Participações por jogo', fmt: (v) => dec(v, 2) },
  { key: 'manOfTheMatch', label: 'Craque', hint: 'Melhor em campo' },
  { key: 'ratingAve', label: 'Nota', hint: 'Nota média', rating: true },
  { key: 'passSuccessRate', label: 'Passe', fmt: pct },
  { key: 'tackleSuccessRate', label: 'Desarme', fmt: pct },
  { key: 'shotSuccessRate', label: 'Finaliz.', fmt: pct },
  { key: 'winRate', label: 'Vitórias', fmt: pct },
  { key: 'redCards', label: 'CV', hint: 'Cartões vermelhos' },
];

function ratingClass(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

export default function PlayersTable({ members }) {
  const [sort, setSort] = useState({ key: 'ga', dir: 'desc' });
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    const enriched = (members || []).map((m) => ({
      ...m,
      ga: m.goals + m.assists,
      perGame: m.gamesPlayed ? (m.goals + m.assists) / m.gamesPlayed : 0,
      group: posGroup(m.favoritePosition || m.proPos),
    }));

    const filtered =
      filter === 'all' ? enriched : enriched.filter((m) => m.group === filter);

    return filtered.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === 'string' || typeof bv === 'string') {
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [members, sort, filter]);

  function toggle(key) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' },
    );
  }

  if (!members?.length) {
    return (
      <div className="panel pad" style={{ color: 'var(--muted)' }}>
        A EA não devolveu o elenco deste clube agora. Tente recarregar em alguns minutos.
      </div>
    );
  }

  const FILTERS = [
    ['all', 'Todos'],
    ['gk', 'Goleiros'],
    ['def', 'Defesa'],
    ['mid', 'Meio'],
    ['att', 'Ataque'],
  ];

  return (
    <div className="stack">
      <div className="tabs">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            className={`tab ${filter === id ? 'on' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  title={c.hint || c.label}
                  className={sort.key === c.key ? 'sorted' : ''}
                  onClick={() => toggle(c.key)}
                >
                  {c.label}
                  {sort.key === c.key ? (sort.dir === 'desc' ? ' ▾' : ' ▴') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.name}>
                <td>
                  <span className="player-cell">
                    <span className={`poschip ${m.group}`}>
                      {posLabel(m.favoritePosition || m.proPos)}
                    </span>
                    <span style={{ fontWeight: 620 }}>{m.name}</span>
                  </span>
                </td>
                {COLUMNS.slice(1).map((c) => {
                  const value = m[c.key] ?? 0;
                  if (c.rating) {
                    return (
                      <td key={c.key}>
                        <span className={`rating ${ratingClass(value)}`}>
                          {dec(value, 2)}
                        </span>
                      </td>
                    );
                  }
                  return <td key={c.key}>{c.fmt ? c.fmt(value) : value}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
