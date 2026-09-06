'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { posLabel, posGroup, dec, pct, nf } from '@/lib/format';

/**
 * A EA expõe o elenco em dois recortes diferentes, e eles não trazem os mesmos
 * campos. Os percentuais (passe, desarme, finalização, vitórias) só existem no
 * recorte da temporada; a carreira traz apenas o essencial acumulado. Por isso
 * a tabela troca de colunas junto com o modo, em vez de mostrar zeros falsos.
 */
const BASE_COLUMNS = [
  { key: 'name', label: 'Jogador', type: 'text' },
  { key: 'gamesPlayed', label: 'J', hint: 'Jogos', fmt: nf },
  { key: 'goals', label: 'G', hint: 'Gols', fmt: nf },
  { key: 'assists', label: 'A', hint: 'Assistências', fmt: nf },
  { key: 'ga', label: 'G+A', hint: 'Participações em gols', fmt: nf },
  { key: 'perGame', label: 'G+A/J', hint: 'Participações por jogo', fmt: (v) => dec(v, 2) },
  { key: 'mom', label: 'Craque', hint: 'Melhor em campo', fmt: nf },
  { key: 'rating', label: 'Nota', hint: 'Nota média', rating: true },
];

const SEASON_ONLY = [
  { key: 'passSuccessRate', label: 'Passe', hint: 'Acerto de passe', fmt: pct },
  { key: 'tackleSuccessRate', label: 'Desarme', hint: 'Acerto de desarme', fmt: pct },
  { key: 'shotSuccessRate', label: 'Finaliz.', hint: 'Acerto de finalização', fmt: pct },
  { key: 'winRate', label: 'Vitórias', hint: 'Percentual de vitórias', fmt: pct },
  { key: 'redCards', label: 'CV', hint: 'Cartões vermelhos', fmt: nf },
];

function ratingClass(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

export default function PlayersTable({ members, platform, clubId }) {
  const [mode, setMode] = useState('season');
  const [sort, setSort] = useState({ key: 'ga', dir: 'desc' });
  const [filter, setFilter] = useState('all');

  const hasSeason = useMemo(() => (members || []).some((m) => m.season), [members]);
  const hasCareer = useMemo(() => (members || []).some((m) => m.career), [members]);
  const effectiveMode = mode === 'season' && !hasSeason ? 'career' : mode;

  const columns = useMemo(
    () => (effectiveMode === 'season' ? [...BASE_COLUMNS, ...SEASON_ONLY] : BASE_COLUMNS),
    [effectiveMode],
  );

  const rows = useMemo(() => {
    const enriched = (members || [])
      .map((m) => {
        const s = effectiveMode === 'career' ? m.career : m.season;
        if (!s) return null;
        return {
          name: m.name,
          pos: m.pos,
          group: posGroup(m.pos),
          proOverall: m.proOverall,
          ...s,
          ga: (s.goals || 0) + (s.assists || 0),
          perGame: s.gamesPlayed ? ((s.goals || 0) + (s.assists || 0)) / s.gamesPlayed : 0,
        };
      })
      .filter(Boolean);

    const filtered = filter === 'all' ? enriched : enriched.filter((m) => m.group === filter);

    const key = columns.some((c) => c.key === sort.key) ? sort.key : 'ga';

    return filtered.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'string' || typeof bv === 'string') {
        return sort.dir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sort.dir === 'asc' ? (av || 0) - (bv || 0) : (bv || 0) - (av || 0);
    });
  }, [members, sort, filter, effectiveMode, columns]);

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
      <div className="row spread row-wrap" style={{ gap: 10 }}>
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

        {hasSeason && hasCareer && (
          <div className="tabs">
            <button
              className={`tab ${effectiveMode === 'season' ? 'on' : ''}`}
              onClick={() => setMode('season')}
            >
              Temporada
            </button>
            <button
              className={`tab ${effectiveMode === 'career' ? 'on' : ''}`}
              onClick={() => setMode('career')}
            >
              Carreira
            </button>
          </div>
        )}
      </div>

      {effectiveMode === 'career' && (
        <p style={{ color: 'var(--dim)', fontSize: 13 }}>
          Na carreira a EA só publica jogos, gols, assistências, craque do jogo e nota
          média. Os percentuais existem apenas no recorte da temporada.
        </p>
      )}

      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
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
                    <span className={`poschip ${m.group}`}>{posLabel(m.pos)}</span>
                    {platform && clubId ? (
                      <Link
                        href={`/clube/${platform}/${clubId}/jogador/${encodeURIComponent(m.name)}`}
                        className="link-jogador"
                      >
                        {m.name}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 620 }}>{m.name}</span>
                    )}
                    {m.proOverall ? (
                      <span className="ovr" title="Overall do pro">
                        {m.proOverall}
                      </span>
                    ) : null}
                  </span>
                </td>
                {columns.slice(1).map((c) => {
                  const value = m[c.key] ?? 0;
                  if (c.rating) {
                    return (
                      <td key={c.key}>
                        <span className={`rating ${ratingClass(value)}`}>{dec(value, 2)}</span>
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
