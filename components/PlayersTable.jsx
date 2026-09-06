'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useDic } from '@/components/I18nProvider';
import { posLabel, posGroup, dec, pct, nf } from '@/lib/format';

/**
 * EA exposes the squad in two different views, and they do not carry the same
 * fields. The percentages (pass, tackle, shot, wins) only exist in the season
 * view; career only brings the essential totals. That is why the table swaps
 * columns along with the mode instead of showing fake zeros.
 */
function buildColumns(dic, mode) {
  const c = dic.squad.cols;
  const base = [
    { key: 'name', label: c.name, type: 'text' },
    { key: 'gamesPlayed', label: c.games, hint: c.gamesHint, fmt: (v) => nf(v, dic) },
    { key: 'goals', label: c.goals, hint: c.goalsHint, fmt: (v) => nf(v, dic) },
    { key: 'assists', label: c.assists, hint: c.assistsHint, fmt: (v) => nf(v, dic) },
    { key: 'ga', label: c.ga, hint: c.gaHint, fmt: (v) => nf(v, dic) },
    { key: 'perGame', label: c.perGame, hint: c.perGameHint, fmt: (v) => dec(v, 2, dic) },
    { key: 'mom', label: c.mom, hint: c.momHint, fmt: (v) => nf(v, dic) },
    { key: 'rating', label: c.rating, hint: c.ratingHint, rating: true },
  ];
  if (mode !== 'season') return base;
  return [
    ...base,
    { key: 'passSuccessRate', label: c.pass, hint: c.passHint, fmt: pct },
    { key: 'tackleSuccessRate', label: c.tackle, hint: c.tackleHint, fmt: pct },
    { key: 'shotSuccessRate', label: c.shot, hint: c.shotHint, fmt: pct },
    { key: 'winRate', label: c.wins, hint: c.winsHint, fmt: pct },
    { key: 'redCards', label: c.red, hint: c.redHint, fmt: (v) => nf(v, dic) },
  ];
}

function ratingClass(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

export default function PlayersTable({ members, platform, clubId }) {
  const dic = useDic();
  const [mode, setMode] = useState('season');
  const [sort, setSort] = useState({ key: 'ga', dir: 'desc' });
  const [filter, setFilter] = useState('all');

  const hasSeason = useMemo(() => (members || []).some((m) => m.season), [members]);
  const hasCareer = useMemo(() => (members || []).some((m) => m.career), [members]);
  const effectiveMode = mode === 'season' && !hasSeason ? 'career' : mode;

  const columns = useMemo(() => buildColumns(dic, effectiveMode), [dic, effectiveMode]);

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
        {dic.squad.empty}
      </div>
    );
  }

  const FILTERS = [
    ['all', dic.squad.filters.all],
    ['gk', dic.squad.filters.gk],
    ['def', dic.squad.filters.def],
    ['mid', dic.squad.filters.mid],
    ['att', dic.squad.filters.att],
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
              {dic.squad.season}
            </button>
            <button
              className={`tab ${effectiveMode === 'career' ? 'on' : ''}`}
              onClick={() => setMode('career')}
            >
              {dic.squad.career}
            </button>
          </div>
        )}
      </div>

      {effectiveMode === 'career' && (
        <p style={{ color: 'var(--dim)', fontSize: 13 }}>{dic.squad.careerNote}</p>
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
                      <span className="ovr" title={dic.squad.cols.ovr}>
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
                        <span className={`rating ${ratingClass(value)}`}>{dec(value, 2, dic)}</span>
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
