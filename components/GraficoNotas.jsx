'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evolução de nota, partida a partida.
 *
 * O desenho é medido em pixels reais do container, não esticado a partir de um
 * viewBox fixo. Sem isso o mesmo SVG que fica legível no computador vira letra
 * de 4px no celular, porque o texto encolhe junto com o desenho.
 *
 * Uma série só, então não precisa de legenda de cor: o título já diz o que é a
 * linha. O resultado de cada jogo aparece embaixo pela letra V, E ou D, nunca só
 * pela cor, para continuar legível para quem não distingue verde de vermelho.
 */
export default function GraficoNotas({ partidas, media }) {
  const caixa = useRef(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return undefined;
    const medir = () => setLargura(alvo.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(alvo);
    return () => obs.disconnect();
  }, []);

  const pontos = (partidas || []).filter((p) => p.rating > 0);

  if (pontos.length < 2) {
    return (
      <p className="vazio-nota">
        A EA devolve o histórico das últimas partidas do clube, e neste recorte
        {pontos.length ? ' só apareceu uma partida dele' : ' ele não aparece em nenhuma'}.
        A linha de evolução precisa de pelo menos duas.
      </p>
    );
  }

  const W = Math.max(largura || 0, 280);
  const estreito = W < 520;
  const H = estreito ? 208 : 236;
  const L = 34;
  const R = 14;
  const T = 18;
  const B = 46;

  const notas = pontos.map((p) => p.rating);
  const baixo = Math.max(0, Math.floor(Math.min(...notas, media ?? 10) - 0.5));
  const alto = Math.min(10, Math.ceil(Math.max(...notas, media ?? 0) + 0.5));
  const faixa = alto - baixo || 1;

  const larguraUtil = Math.max(W - L - R, 40);
  const alturaUtil = H - T - B;

  const x = (i) => L + (larguraUtil / (pontos.length - 1)) * i;
  const y = (v) => T + alturaUtil - ((v - baixo) / faixa) * alturaUtil;

  const espaco = larguraUtil / (pontos.length - 1);
  const raio = espaco < 22 ? 3.5 : 4.5;
  // Com muitos jogos em pouco espaço, as letras se encavalam. Aí só as ímpares
  // aparecem, e o resto continua no toque de cada ponto.
  const passoLetra = espaco < 16 ? 2 : 1;

  const linha = pontos.map((p, i) => `${x(i)},${y(p.rating)}`).join(' ');

  const ticks = [];
  for (let v = baixo; v <= alto; v += faixa <= 3 ? 1 : 2) ticks.push(v);

  const melhorIndice = notas.indexOf(Math.max(...notas));
  const rotulados = new Set([melhorIndice, pontos.length - 1]);

  return (
    <div ref={caixa} className="grafico-caixa">
      {largura > 0 && (
        <svg
          className="grafico-notas"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Nota por partida, da mais antiga para a mais recente"
        >
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={L}
                y1={y(v)}
                x2={W - R}
                y2={y(v)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" className="gn-tick">
                {v.toFixed(1).replace('.', ',')}
              </text>
            </g>
          ))}

          {/* Média do jogador no recorte, como referência. */}
          {Number.isFinite(media) && media > baixo && media < alto && (
            <>
              <line
                x1={L}
                y1={y(media)}
                x2={W - R}
                y2={y(media)}
                stroke="rgba(141,151,168,0.55)"
                strokeWidth="1"
              />
              <text x={W - R} y={y(media) - 6} textAnchor="end" className="gn-media">
                média {media.toFixed(2).replace('.', ',')}
              </text>
            </>
          )}

          <polyline
            points={linha}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {pontos.map((p, i) => (
            <g key={p.matchId || i}>
              <circle
                cx={x(i)}
                cy={y(p.rating)}
                r={raio}
                fill="var(--accent)"
                stroke="var(--panel)"
                strokeWidth="2"
              />
              {/* Alvo de toque maior que a bolinha, para funcionar no celular. */}
              <circle cx={x(i)} cy={y(p.rating)} r={Math.max(espaco / 2, 13)} fill="transparent">
                <title>
                  {`${p.adversario} · ${p.placar} · nota ${p.rating.toFixed(2).replace('.', ',')}` +
                    (p.goals ? ` · ${p.goals}G` : '') +
                    (p.assists ? ` · ${p.assists}A` : '') +
                    (p.mom ? ' · craque do jogo' : '')}
                </title>
              </circle>
              {rotulados.has(i) && (
                // Nota colada no teto do gráfico ganha o rótulo por baixo, senão
                // o texto sai pela borda de cima e fica cortado.
                <text
                  x={x(i)}
                  y={y(p.rating) - T > 16 ? y(p.rating) - 12 : y(p.rating) + 19}
                  textAnchor="middle"
                  className="gn-valor"
                >
                  {p.rating.toFixed(2).replace('.', ',')}
                </text>
              )}
              {i % passoLetra === 0 && (
                <text x={x(i)} y={H - 22} textAnchor="middle" className={`gn-res ${p.resultado}`}>
                  {p.resultado}
                </text>
              )}
            </g>
          ))}

          <text x={L} y={H - 5} className="gn-eixo">
            mais antiga
          </text>
          <text x={W - R} y={H - 5} textAnchor="end" className="gn-eixo">
            mais recente
          </text>
        </svg>
      )}
    </div>
  );
}
