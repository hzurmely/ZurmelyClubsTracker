/**
 * Radar do DNA.
 *
 * Duas figuras sobrepostas: o jogador e a média do elenco dele. O topo de cada
 * eixo é o melhor do elenco naquele item, então a figura responde "onde ele
 * está em relação aos companheiros", não "ele é bom em termos absolutos".
 *
 * Todos os seis valores aparecem escritos ao lado do desenho, de propósito: o
 * radar mostra o formato, os números mostram o dado. Quem não consegue ler o
 * polígono ainda tem tudo em texto.
 */

const R = 104;
const CX = 210;
const CY = 158;

function ponto(indice, total, escala) {
  const angulo = (-90 + (360 / total) * indice) * (Math.PI / 180);
  const raio = (R * Math.max(0, Math.min(100, escala))) / 100;
  return [CX + raio * Math.cos(angulo), CY + raio * Math.sin(angulo)];
}

function poligono(eixos, campo) {
  return eixos.map((e, i) => ponto(i, eixos.length, e[campo]).join(',')).join(' ');
}

export default function RadarDNA({ eixos, nome }) {
  if (!eixos?.length) return null;

  const aneis = [25, 50, 75, 100];

  return (
    <div className="radar-bloco">
      <svg
        className="radar"
        viewBox="0 0 420 320"
        role="img"
        aria-label={`Radar de ${nome} comparado à média do elenco`}
      >
        {/* Malha de fundo. Traço fino e sólido, um tom acima do painel. */}
        {aneis.map((a) => (
          <polygon
            key={a}
            points={eixos.map((_, i) => ponto(i, eixos.length, a).join(',')).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}
        {eixos.map((_, i) => {
          const [x, y] = ponto(i, eixos.length, 100);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
          );
        })}

        {/* Média do elenco: referência, não é uma série concorrente. Por isso
            cinza neutro, sem preenchimento forte. */}
        <polygon
          points={poligono(eixos, 'escalaElenco')}
          fill="rgba(141,151,168,0.10)"
          stroke="rgba(141,151,168,0.75)"
          strokeWidth="1.5"
        />

        {/* O jogador. */}
        <polygon
          points={poligono(eixos, 'escala')}
          fill="rgba(43,127,255,0.22)"
          stroke="var(--accent)"
          strokeWidth="2"
        />

        {eixos.map((e, i) => {
          const [x, y] = ponto(i, eixos.length, e.escala);
          return (
            <circle
              key={e.chave}
              cx={x}
              cy={y}
              r="4"
              fill="var(--accent)"
              stroke="var(--panel)"
              strokeWidth="2"
            >
              <title>{`${e.rotulo}: ${e.texto} (${e.posicao}º de ${e.de} no elenco)`}</title>
            </circle>
          );
        })}

        {/* Rótulos nas pontas. */}
        {eixos.map((e, i) => {
          const [x, y] = ponto(i, eixos.length, 131);
          const meio = Math.abs(x - CX) < 6;
          const ancora = meio ? 'middle' : x > CX ? 'start' : 'end';
          return (
            <text
              key={e.chave}
              x={x}
              y={y + (meio ? (y < CY ? -2 : 10) : 4)}
              textAnchor={ancora}
              className="radar-rotulo"
            >
              {e.rotulo}
            </text>
          );
        })}
      </svg>

      <ul className="radar-lista">
        {eixos.map((e) => (
          <li key={e.chave}>
            <span className="rl-nome">{e.rotulo}</span>
            <span className="rl-barra">
              <i style={{ width: `${Math.max(e.escala, 1.5)}%` }} />
              <b style={{ left: `${Math.min(Math.max(e.escalaElenco, 0), 100)}%` }} />
            </span>
            <span className="rl-valor">{e.texto}</span>
            <span className="rl-pos">
              {e.posicao}º de {e.de}
            </span>
          </li>
        ))}
      </ul>

      <div className="radar-legenda">
        <span>
          <i className="marca jogador" /> {nome}
        </span>
        <span>
          <i className="marca elenco" /> média do elenco
        </span>
      </div>
    </div>
  );
}
