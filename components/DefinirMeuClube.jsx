'use client';

import { useEffect, useState } from 'react';
import { useDic } from '@/components/I18nProvider';
import { lerMeuClube, salvarMeuClube, limparMeuClube } from '@/lib/meuClube';

/**
 * Button on the club page. Marks (or unmarks) that club as the favourite shown
 * on the home page. It all lives in the browser of whoever clicked.
 */
export default function DefinirMeuClube({ id, platform, name }) {
  const dic = useDic();
  const [ehMeu, setEhMeu] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const conferir = () => {
      const salvo = lerMeuClube();
      setEhMeu(!!salvo && salvo.id === String(id) && salvo.platform === platform);
    };
    conferir();
    setMontado(true);
    window.addEventListener('zct:meu-clube', conferir);
    return () => window.removeEventListener('zct:meu-clube', conferir);
  }, [id, platform]);

  // Before mounting in the browser there is no way to know the preference, and
  // rendering a guessed state would cause that ugly flicker.
  if (!montado) return null;

  return (
    <button
      type="button"
      className={ehMeu ? 'btn' : 'btn ghost'}
      onClick={() => (ehMeu ? limparMeuClube() : salvarMeuClube({ id, platform, name }))}
      title={ehMeu ? dic.myClub.unsetTitle : dic.myClub.setTitle}
    >
      {ehMeu ? dic.myClub.unset : dic.myClub.set}
    </button>
  );
}
