'use client';

import { initials, kitColor, readableOn } from '@/lib/format';

/**
 * Escudo do clube.
 *
 * A EA não publica nenhum endereço acessível para os escudos customizados dos
 * clubes: os padrões que a comunidade usava foram todos ao ar (testei os cinco
 * conhecidos e todos dão erro), e os trackers grandes também não exibem o escudo
 * de verdade. Então em vez de ficar tentando imagens que nunca carregam, aqui o
 * escudo é desenhado com as cores reais do uniforme do clube, que a API entrega.
 *
 * Se um dia aparecer uma URL que funcione, é só voltar a renderizar um <img> e
 * usar este desenho como reserva.
 */
export default function Crest({ club, size = 44, radius = 12 }) {
  const kit = club?.customKit || null;

  const primary = kitColor(kit?.kitColor1, '#2b7fff');
  const secondary = kitColor(kit?.kitColor2, '#56c8ff');
  const accent = kitColor(kit?.crestColor, secondary);
  const ink = readableOn(primary);

  const label = initials(club?.name);
  const id = `crest-${String(club?.clubId || label).replace(/[^a-z0-9]/gi, '')}`;

  return (
    <div
      className="crest"
      style={{ width: size, height: size, borderRadius: radius }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" role="presentation">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${id})`} />
        <path d="M0 44 L64 20 L64 64 L0 64 Z" fill={accent} opacity="0.28" />
        <text
          x="32"
          y="33"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="26"
          fontWeight="800"
          fontFamily="inherit"
          letterSpacing="-1"
          fill={ink}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
