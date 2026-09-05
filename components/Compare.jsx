'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Crest from '@/components/Crest';
import { nf, pct, dec, divisionName } from '@/lib/format';

function useClub(initial) {
  const [ref, setRef] = useState(initial); // { platform, clubId }
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ref) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    fetch(`/api/ea/club?platform=${ref.platform}&id=${ref.clubId}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ref]);

  return { ref, setRef, data, loading };
}

function derive(d) {
  if (!d?.info) return null;
  const o = d.overall || {};
  const played = o.gamesPlayed || 0;
  const squad = d.members || [];
  const top = [...squad].sort((a, b) => b.goals - a.goals)[0];
  const avgRating = squad.length
    ? squad.reduce((s, p) => s + p.ratingAve, 0) / squad.length
    : 0;

  return {
    info: d.info,
    platform: d.platform,
    jogos: played,
    vitorias: o.wins || 0,
    aproveitamento: played ? ((o.wins * 3 + o.ties) / (played * 3)) * 100 : 0,
    gols: o.goals || 0,
    sofridos: o.goalsAgainst || 0,
    saldo: (o.goals || 0) - (o.goalsAgainst || 0),
    golsPorJogo: played ? o.goals / played : 0,
    skill: o.skillRating || 0,
    divisao: o.bestDivision || 0,
    elenco: squad.length,
    avgRating,
    artilheiro: top ? `${top.name} (${top.goals})` : '—',
  };
}

const ROWS = [
  { k: 'jogos', label: 'Jogos', fmt: nf, better: 'high' },
  { k: 'vitorias', label: 'Vitórias', fmt: nf, better: 'high' },
  { k: 'aproveitamento', label: 'Aproveitamento', fmt: pct, better: 'high' },
  { k: 'gols', label: 'Gols marcados', fmt: nf, better: 'high' },
  { k: 'sofridos', label: 'Gols sofridos', fmt: nf, better: 'low' },
  { k: 'saldo', label: 'Saldo', fmt: (v) => (v > 0 ? `+${nf(v)}` : nf(v)), better: 'high' },
  { k: 'golsPorJogo', label: 'Gols por jogo', fmt: (v) => dec(v, 2), better: 'high' },
  { k: 'skill', label: 'Skill rating', fmt: nf, better: 'high' },
  { k: 'divisao', label: 'Melhor divisão', fmt: divisionName, better: 'low' },
  { k: 'elenco', label: 'Jogadores', fmt: nf, better: 'high' },
  { k: 'avgRating', label: 'Nota média do elenco', fmt: (v) => dec(v, 2), better: 'high' },
  { k: 'artilheiro', label: 'Artilheiro', fmt: (v) => v, better: null },
];

function Slot({ label, club, loading, onPick, onClear }) {
  if (club?.info) {
    return (
      <div className="panel pad stack" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 14 }}>
          <Crest club={club.info} size={54} radius={14} />
          <div className="grow">
            <div className="lbl" style={{ fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {label}
            </div>
            <Link href={`/clube/${club.platform}/${club.info.clubId}`}>
              <h3 style={{ fontSize: 20 }}>{club.info.name}</h3>
            </Link>
          </div>
        </div>
        <button className="tab" onClick={onClear} style={{ alignSelf: 'flex-start' }}>
          Trocar clube
        </button>
      </div>
    );
  }

  return (
    <div className="panel pad stack" style={{ gap: 12 }}>
      <div className="panel-title" style={{ margin: 0 }}>
        {label}
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 54 }} />
      ) : (
        <SearchBar placeholder="Buscar clube..." onPick={onPick} inline />
      )}
    </div>
  );
}

function parseRef(value) {
  if (!value) return null;
  const [platform, clubId] = String(value).split(':');
  if (!platform || !clubId) return null;
  return { platform, clubId };
}

export default function Compare() {
  const params = useSearchParams();
  const a = useClub(parseRef(params.get('a')));
  const b = useClub(parseRef(params.get('b')));

  const pickA = useCallback((c) => a.setRef({ platform: c.platform, clubId: c.clubId }), [a]);
  const pickB = useCallback((c) => b.setRef({ platform: c.platform, clubId: c.clubId }), [b]);

  const A = derive(a.data);
  const B = derive(b.data);

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>Comparar clubes</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            Escolha dois clubes e veja quem leva a melhor em cada número.
          </p>
        </div>

        <div className="grid-2">
          <Slot
            label="Clube A"
            club={A}
            loading={a.loading}
            onPick={pickA}
            onClear={() => a.setRef(null)}
          />
          <Slot
            label="Clube B"
            club={B}
            loading={b.loading}
            onPick={pickB}
            onClear={() => b.setRef(null)}
          />
        </div>

        {A && B ? (
          <div className="table-scroll">
            <table className="data" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ cursor: 'default' }}>Métrica</th>
                  <th style={{ cursor: 'default', textAlign: 'center' }}>{A.info.name}</th>
                  <th style={{ cursor: 'default', textAlign: 'center' }}>{B.info.name}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const va = A[r.k];
                  const vb = B[r.k];
                  let winner = null;
                  if (r.better && typeof va === 'number' && typeof vb === 'number' && va !== vb) {
                    const aWins = r.better === 'high' ? va > vb : va < vb;
                    // Divisão 0 significa "sem divisão", nunca é a melhor.
                    if (r.k === 'divisao' && (!va || !vb)) winner = va ? 'a' : vb ? 'b' : null;
                    else winner = aWins ? 'a' : 'b';
                  }
                  const cell = (side, value) => ({
                    textAlign: 'center',
                    fontWeight: winner === side ? 750 : 500,
                    color: winner === side ? 'var(--accent)' : 'var(--text)',
                  });
                  return (
                    <tr key={r.k}>
                      <td style={{ color: 'var(--muted)' }}>{r.label}</td>
                      <td style={cell('a', va)}>{r.fmt(va)}</td>
                      <td style={cell('b', vb)}>{r.fmt(vb)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel pad" style={{ color: 'var(--muted)' }}>
            Selecione os dois clubes acima para montar a comparação.
          </div>
        )}
      </div>
    </section>
  );
}
