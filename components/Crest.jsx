'use client';

import { useState } from 'react';
import { initials, kitColor } from '@/lib/format';

/**
 * A EA não publica uma URL oficial e estável para o escudo customizado dos clubes.
 * Os padrões abaixo são os que a comunidade usa hoje; se algum dia pararem de
 * funcionar, o componente cai sozinho no monograma colorido, então a interface
 * nunca fica quebrada. Basta atualizar a lista quando descobrir um endereço novo.
 */
function candidates(crestAssetId) {
  if (!crestAssetId) return [];
  const id = String(crestAssetId);
  return [
    `https://fifa26.content.easports.com/fifa/fltOnlineAssets/24B1C4A4-DA1E-4D64-9F80-4B0EB4F0B4A1/2026/fcweb/crests/256x256/l${id}.png`,
    `https://fifa25.content.easports.com/fifa/fltOnlineAssets/24B1C4A4-DA1E-4D64-9F80-4B0EB4F0B4A1/2025/fcweb/crests/256x256/l${id}.png`,
    `https://media.contentapi.ea.com/content/fifa/fifa-ultimate-team/crests/256x256/l${id}.png`,
  ];
}

export default function Crest({ club, size = 44, radius = 12 }) {
  const kit = club?.customKit || null;
  const list = candidates(kit?.crestAssetId);
  const [step, setStep] = useState(0);

  const color = kitColor(kit?.kitColor1);
  const src = list[step];

  const style = {
    width: size,
    height: size,
    borderRadius: radius,
    background: src
      ? 'var(--panel-3)'
      : `linear-gradient(140deg, ${color}, ${kitColor(kit?.crestColor, '#12d6ff')})`,
  };

  return (
    <div className="crest" style={style} aria-hidden="true">
      {src ? (
        <img
          src={src}
          alt=""
          onError={() => setStep((s) => s + 1)}
          loading="lazy"
        />
      ) : (
        <span className="mono" style={{ fontSize: Math.round(size * 0.36) }}>
          {initials(club?.name)}
        </span>
      )}
    </div>
  );
}
