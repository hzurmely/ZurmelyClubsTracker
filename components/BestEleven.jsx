'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FORMACOES, montarEscalacao } from '@/lib/escalacao';
import { dec, initials, nf, posLabel } from '@/lib/format';

function classeNota(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

/**
 * O campinho com o time ideal. Quem escolhe os onze é o lib/escalacao.js; aqui
 * é só a apresentação, mais a troca de formação e de recorte.
 */
export default function BestEleven({ members, platform, clubId }) {
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
          Escalação ideal
        </div>

        <div className="row row-wrap" style={{ gap: 10 }}>
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

          {automatica ? (
            <span className="tag" title="O elenco tem menos de onze jogadores com partidas, então o campo segue o elenco em vez de uma formação fixa.">
              formação automática
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
          // Cada card leva para o DNA do jogador quando sabemos de que clube ele é.
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
                ? `${vaga.jogador.name} · ${nf(vaga.jogador.jogos)} jogos · nota ${dec(vaga.jogador.nota, 2)}`
                : 'Sem jogador para esta vaga'
            }
            {...extra}
          >
            {vaga.jogador ? (
              <>
                <div className={`spot-badge ${vaga.grupo} ${vaga.improviso ? 'fora' : ''}`}>
                  <span className="ini">{initials(vaga.jogador.name)}</span>
                  <span className={`spot-nota ${classeNota(vaga.jogador.nota)}`}>
                    {dec(vaga.jogador.nota, 1)}
                  </span>
                </div>
                <div className="spot-nome">{vaga.jogador.name}</div>
                <div className="spot-pos">
                  {posLabel(vaga.jogador.pos)}
                  {vaga.improviso ? ' · improviso' : ''}
                </div>
              </>
            ) : (
              <>
                <div className="spot-badge vazio">
                  <span className="ini">–</span>
                </div>
                <div className="spot-pos">vaga livre</div>
              </>
            )}
          </Caixa>
          );
        })}
      </div>

      <p style={{ color: 'var(--dim)', fontSize: 13, margin: 0 }}>
        Os onze saem da nota média de cada jogador ajustada pelo número de jogos, para
        que quem jogou pouco não passe na frente de quem sustenta o nível. A média do
        elenco é {dec(media, 2)}, calculada sobre {nf(elenco)} jogadores.
        {automatica &&
          ' A EA só devolve os jogadores com partidas registradas, e aqui vieram menos de onze, então o campo segue o elenco em vez de uma formação fixa.'}
        {improvisos > 0 && ` ${improvisos} ${improvisos === 1 ? 'vaga foi preenchida' : 'vagas foram preenchidas'} fora de posição por falta de gente no setor.`}
        {vazias > 0 && ` ${vazias} ${vazias === 1 ? 'vaga ficou livre' : 'vagas ficaram livres'}.`}
      </p>

      {reservas.length > 0 && (
        <div className="row row-wrap" style={{ gap: 8 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Banco:</span>
          {reservas.map((r) => (
            <span key={r.name} className="tag" title={`nota ${dec(r.nota, 2)} em ${nf(r.jogos)} jogos`}>
              {r.name} · {dec(r.nota, 1)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
