'use client';

import { initials, kitColor, readableOn } from '@/lib/format';

/**
 * Club crest.
 *
 * EA publishes no reachable address for custom club crests: the patterns the
 * community used are all down (I tried the five known ones and every single one
 * errors out), and the big trackers do not show the real crest either. So
 * instead of chasing images that never load, the crest here is drawn with the
 * club real kit colours, which the API does hand over.
 *
 * If a working URL ever turns up, it is just a matter of rendering an <img>
 * again and keeping this drawing as the fallback.
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
