'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { normalizar } from '@/lib/escalacao';
import { useDic } from '@/components/I18nProvider';
import { dec, initials, nf, pct, posLabel, posGroup } from '@/lib/format';

const MINIMO = 5;

function buildTabs(dic) {
  const t = dic.leaderboards.tabs;
  return [
    { id: 'nota', label: t.rating, campo: 'nota', fmt: (v) => dec(v, 2, dic), exigeJogos: true },
    { id: 'gols', label: t.goals, campo: 'gols', fmt: (v) => nf(v, dic) },
    { id: 'assistencias', label: t.assists, campo: 'assistencias', fmt: (v) => nf(v, dic) },
    { id: 'craque', label: t.mom, campo: 'craque', fmt: (v) => nf(v, dic) },
    { id: 'passe', label: t.pass, campo: 'passe', fmt: pct, exigeJogos: true, soTemporada: true },
    { id: 'desarme', label: t.tackle, campo: 'desarme', fmt: pct, exigeJogos: true, soTemporada: true },
    { id: 'finalizacao', label: t.shot, campo: 'finalizacao', fmt: pct, exigeJogos: true, soTemporada: true },
  ];
}

/**
 * Squad rankings, one tab per criterion.
 *
 * The average and percentage tabs carry a minimum number of games, otherwise
 * whoever played once and completed his only pass shows up first with 100%.
 * When the club is too small for the cut to make sense it is waived and the
 * note changes, instead of the table coming back empty.
 */
export default function Leaderboards({ members, platform, clubId }) {
  const dic = useDic();
  const [abaId, setAbaId] = useState('nota');
  const [modo, setModo] = useState('season');

  const temTemporada = useMemo(() => (members || []).some((m) => m.season), [members]);
  const temCarreira = useMemo(() => (members || []).some((m) => m.career), [members]);
  const modoEfetivo = modo === 'season' && !temTemporada ? 'career' : modo;

  const abas = useMemo(
    () => buildTabs(dic).filter((a) => !a.soTemporada || modoEfetivo === 'season'),
    [dic, modoEfetivo],
  );

  const aba = abas.find((a) => a.id === abaId) || abas[0];

  const { linhas, cortou } = useMemo(() => {
    const jogadores = normalizar(members, modoEfetivo).filter((j) => j.jogos > 0);

    const comValor = jogadores.filter(
      (j) => j[aba.campo] !== null && j[aba.campo] !== undefined,
    );

    const elegiveis = comValor.filter((j) => j.jogos >= MINIMO);
    const usaCorte = aba.exigeJogos && elegiveis.length >= 3;
    const base = usaCorte ? elegiveis : comValor;

    return {
      cortou: usaCorte,
      linhas: [...base]
        .sort((a, b) => (b[aba.campo] || 0) - (a[aba.campo] || 0) || b.jogos - a.jogos)
        .slice(0, 8),
    };
  }, [members, modoEfetivo, aba]);

  if (!members?.length) return null;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row spread row-wrap" style={{ gap: 10 }}>
        <div className="panel-title" style={{ margin: 0 }}>
          {dic.leaderboards.title}
        </div>

        {temTemporada && temCarreira && (
          <div className="tabs">
            <button
              className={`tab ${modoEfetivo === 'season' ? 'on' : ''}`}
              onClick={() => setModo('season')}
            >
              {dic.squad.season}
            </button>
            <button
              className={`tab ${modoEfetivo === 'career' ? 'on' : ''}`}
              onClick={() => setModo('career')}
            >
              {dic.squad.career}
            </button>
          </div>
        )}
      </div>

      <div className="tabs row-wrap">
        {abas.map((a) => (
          <button
            key={a.id}
            className={`tab ${aba.id === a.id ? 'on' : ''}`}
            onClick={() => setAbaId(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {linhas.length === 0 ? (
          <div className="pad" style={{ color: 'var(--muted)' }}>
            {dic.leaderboards.empty}
          </div>
        ) : (
          <ol className="lb">
            {linhas.map((j, i) => {
              const Caixa = platform && clubId ? Link : 'span';
              const extra =
                Caixa === Link
                  ? { href: `/clube/${platform}/${clubId}/jogador/${encodeURIComponent(j.name)}` }
                  : {};
              return (
                <li key={j.name}>
                  <Caixa className="lb-item" {...extra}>
                    <span className={`lb-pos ${i < 3 ? `top${i + 1}` : ''}`}>{i + 1}</span>
                    <span className={`lb-ini ${posGroup(j.pos)}`}>{initials(j.name)}</span>
                    <span className="grow">
                      <span className="lb-nome">{j.name}</span>
                      <span className="lb-sub">
                        {posLabel(j.pos)} · {dic.leaderboards.games(nf(j.jogos, dic))}
                      </span>
                    </span>
                    <span className="lb-valor">{aba.fmt(j[aba.campo] || 0)}</span>
                  </Caixa>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0 }}>
        {aba.exigeJogos
          ? cortou
            ? dic.leaderboards.noteCut(MINIMO)
            : dic.leaderboards.noteNoCut(MINIMO)
          : dic.leaderboards.noteSum}
      </p>
    </div>
  );
}
