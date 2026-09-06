'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { normalizar } from '@/lib/escalacao';
import { dec, initials, nf, pct, posLabel, posGroup } from '@/lib/format';

const MINIMO = 5;

const ABAS = [
  { id: 'nota', label: 'Nota média', campo: 'nota', fmt: (v) => dec(v, 2), exigeJogos: true },
  { id: 'gols', label: 'Gols', campo: 'gols', fmt: nf },
  { id: 'assistencias', label: 'Assistências', campo: 'assistencias', fmt: nf },
  { id: 'craque', label: 'Craque do jogo', campo: 'craque', fmt: nf },
  { id: 'passe', label: '% Passes', campo: 'passe', fmt: pct, exigeJogos: true, soTemporada: true },
  { id: 'desarme', label: '% Desarmes', campo: 'desarme', fmt: pct, exigeJogos: true, soTemporada: true },
  { id: 'finalizacao', label: '% Finalização', campo: 'finalizacao', fmt: pct, exigeJogos: true, soTemporada: true },
];

/**
 * Rankings do elenco, uma aba por critério.
 *
 * Nas abas de média e percentual entra um mínimo de partidas, senão quem jogou
 * uma vez e acertou o único passe aparece com 100% em primeiro lugar. Se o
 * clube for pequeno demais para o corte fazer sentido, ele é dispensado e o
 * aviso muda, em vez de a tabela aparecer vazia.
 */
export default function Leaderboards({ members, platform, clubId }) {
  const [abaId, setAbaId] = useState('nota');
  const [modo, setModo] = useState('season');

  const temTemporada = useMemo(() => (members || []).some((m) => m.season), [members]);
  const temCarreira = useMemo(() => (members || []).some((m) => m.career), [members]);
  const modoEfetivo = modo === 'season' && !temTemporada ? 'career' : modo;

  const abas = useMemo(
    () => ABAS.filter((a) => !a.soTemporada || modoEfetivo === 'season'),
    [modoEfetivo],
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
          Leaderboards
        </div>

        {temTemporada && temCarreira && (
          <div className="tabs">
            <button
              className={`tab ${modoEfetivo === 'season' ? 'on' : ''}`}
              onClick={() => setModo('season')}
            >
              Temporada
            </button>
            <button
              className={`tab ${modoEfetivo === 'career' ? 'on' : ''}`}
              onClick={() => setModo('career')}
            >
              Carreira
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
            Ninguém do elenco tem esse dado nesta consulta.
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
                        {posLabel(j.pos)} · {nf(j.jogos)} jogos
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
            ? `Nesta aba entram só quem tem ${MINIMO} partidas ou mais, para média curta não roubar o topo.`
            : `O corte de ${MINIMO} partidas foi dispensado: o elenco não tem gente suficiente acima dele. Leia as médias de quem jogou pouco com desconfiança.`
          : 'Números somados no recorte escolhido, sem corte de partidas.'}
      </p>
    </div>
  );
}
