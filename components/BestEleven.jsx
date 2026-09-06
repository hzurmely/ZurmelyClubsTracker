'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FORMACOES, montarEscalacao } from '@/lib/escalacao';
import { useDic } from '@/components/I18nProvider';
import { dec, initials, nf, posLabel } from '@/lib/format';

function classeNota(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

/**
 * The pitch with the best eleven. Who picks the players is lib/escalacao.js;
 * this is only the presentation, plus the formation and view switches.
 */
export default function BestEleven({ members, platform, clubId }) {
  const dic = useDic();
  const [formacaoId, setFormacaoId] = useState('3-5-2');
  const [modo, setModo] = useState('season');

  const temTemporada = useMemo(() => (members || []).some((m) => m.season), [members]);
  const temCarreira = useMemo(() => (members || []).some((m) => m.career), [members]);
  const modoEfetivo = modo === 'season' && !temTemporada ? 'career' : modo;

  const { escalacao, reservas, media, elenco, automatica } = useMemo(
    () => montarEscalacao(members, formacaoId, modoEfetivo),
    [members, formacaoId, modoEfetivo],
  );

  if (!members?.length) return null;

  const improvisos = escalacao.filter((v) => v.improviso && v.jogador).length;
  const vazias = escalacao.filter((v) => !v.jogador).length;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row spread row-wrap" style={{ gap: 10 }}>
        <div className="panel-title" style={{ margin: 0 }}>
          {dic.lineup.title}
        </div>

        <div className="row row-wrap" style={{ gap: 10 }}>
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

          {automatica ? (
            <span className="tag" title={dic.lineup.autoTitle}>
              {dic.lineup.auto}
            </span>
          ) : (
            <div className="tabs">
              {Object.keys(FORMACOES).map((id) => (
                <button
                  key={id}
                  className={`tab ${formacaoId === id ? 'on' : ''}`}
                  onClick={() => setFormacaoId(id)}
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pitch">
        <div className="pitch-lines" aria-hidden="true">
          <span className="meio" />
          <span className="circulo" />
          <span className="area cima" />
          <span className="area baixo" />
        </div>

        {escalacao.map((vaga, i) => {
          // Each card leads to the player DNA when we know which club he is in.
          const Caixa = vaga.jogador && platform && clubId ? Link : 'div';
          const extra =
            Caixa === Link
              ? { href: `/clube/${platform}/${clubId}/jogador/${encodeURIComponent(vaga.jogador.name)}` }
              : {};
          return (
          <Caixa
            key={i}
            className="spot"
            style={{ left: `${vaga.x}%`, top: `${vaga.y}%` }}
            title={
              vaga.jogador
                ? dic.lineup.playerTitle(
                    vaga.jogador.name,
                    nf(vaga.jogador.jogos, dic),
                    dec(vaga.jogador.nota, 2, dic),
                  )
                : dic.lineup.noSlot
            }
            {...extra}
          >
            {vaga.jogador ? (
              <>
                <div className={`spot-badge ${vaga.grupo} ${vaga.improviso ? 'fora' : ''}`}>
                  <span className="ini">{initials(vaga.jogador.name)}</span>
                  <span className={`spot-nota ${classeNota(vaga.jogador.nota)}`}>
                    {dec(vaga.jogador.nota, 1, dic)}
                  </span>
                </div>
                <div className="spot-nome">{vaga.jogador.name}</div>
                <div className="spot-pos">
                  {posLabel(vaga.jogador.pos)}
                  {vaga.improviso ? dic.lineup.outOfPosition : ''}
                </div>
              </>
            ) : (
              <>
                <div className="spot-badge vazio">
                  <span className="ini">–</span>
                </div>
                <div className="spot-pos">{dic.lineup.freeSlot}</div>
              </>
            )}
          </Caixa>
          );
        })}
      </div>

      <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0 }}>
        {dic.lineup.note(dec(media, 2, dic), nf(elenco, dic))}
        {automatica && dic.lineup.noteAuto}
        {improvisos > 0 && dic.lineup.noteImproviso(improvisos)}
        {vazias > 0 && dic.lineup.noteVazias(vazias)}
      </p>

      {reservas.length > 0 && (
        <div className="row row-wrap" style={{ gap: 8 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{dic.lineup.bench}</span>
          {reservas.map((r) => (
            <span key={r.name} className="tag" title={dic.lineup.benchTitle(dec(r.nota, 2, dic), nf(r.jogos, dic))}>
              {r.name} · {dec(r.nota, 1, dic)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
