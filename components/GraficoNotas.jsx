'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Rating trend, match by match.
 *
 * The drawing is measured in the real pixels of its container, not stretched
 * from a fixed viewBox. Without that, the same SVG that reads fine on a desktop
 * turns into 4px type on a phone, because the text shrinks with the drawing.
 *
 * One series only, so no colour legend is needed: the title already says what
 * the line is. Each result shows below as the letter V, E or D, never colour
 * alone, so it stays readable for anyone who cannot tell green from red.
 */
export default function GraficoNotas({ partidas, media, dic }) {
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
        {dic.dna.ratingEmptyA}
        {pontos.length ? dic.dna.ratingEmptyOne : dic.dna.ratingEmptyNone}
        {dic.dna.ratingEmptyB}
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
  // With many games in little space the letters collide. Then only every other
  // one is drawn, and the rest stays in the tap target of each point.
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
          aria-label={dic.dna.ratingAria}
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

          {/* The player average for this view, as a reference line. */}
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
                {dic.dna.ratingAvg(media.toFixed(2).replace('.', ','))}
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
              {/* Tap target larger than the dot, so it works on a phone. */}
              <circle cx={x(i)} cy={y(p.rating)} r={Math.max(espaco / 2, 13)} fill="transparent">
                <title>
                  {dic.match.reading.tooltip(
                    p.adversario,
                    p.placar,
                    p.rating.toFixed(2).replace('.', ','),
                    (p.goals ? ` · ${p.goals}G` : '') +
                      (p.assists ? ` · ${p.assists}A` : '') +
                      (p.mom ? dic.match.reading.tooltipMom : ''),
                  )}
                </title>
              </circle>
              {rotulados.has(i) && (
                // A rating glued to the top of the chart gets its label below,
                // otherwise the text runs past the upper edge and gets clipped.
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
            {dic.dna.oldest}
          </text>
          <text x={W - R} y={H - 5} textAnchor="end" className="gn-eixo">
            {dic.dna.newest}
          </text>
        </svg>
      )}
    </div>
  );
}
