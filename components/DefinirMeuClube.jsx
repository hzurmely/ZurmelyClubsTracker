'use client';

import { useEffect, useState } from 'react';
import { useDic } from '@/components/I18nProvider';
import { lerMeusClubes, mesmoClube, salvarMeuClube, limparMeuClube, LIMITE } from '@/lib/meuClube';

/**
 * Button on the club page. Adds (or removes) that club from the favourites
 * shown on the home page. It all lives in the browser of whoever clicked.
 */
export default function DefinirMeuClube({ id, platform, name }) {
  const dic = useDic();
  const [ehMeu, setEhMeu] = useState(false);
  const [cheio, setCheio] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const conferir = () => {
      const lista = lerMeusClubes();
      setEhMeu(lista.some((c) => mesmoClube(c, { id, platform })));
      setCheio(lista.length >= LIMITE);
    };
    conferir();
    setMontado(true);
    window.addEventListener('zct:meu-clube', conferir);
    return () => window.removeEventListener('zct:meu-clube', conferir);
  }, [id, platform]);

  // Before mounting in the browser there is no way to know the preference, and
  // rendering a guessed state would cause that ugly flicker.
  if (!montado) return null;

  const bloqueado = !ehMeu && cheio;

  return (
    <button
      type="button"
      className={ehMeu ? 'btn' : 'btn ghost'}
      disabled={bloqueado}
      onClick={() =>
        ehMeu ? limparMeuClube(id, platform) : salvarMeuClube({ id, platform, name })
      }
      title={bloqueado ? dic.myClub.fullTitle(LIMITE) : ehMeu ? dic.myClub.unsetTitle : dic.myClub.setTitle}
    >
      {ehMeu ? dic.myClub.unset : bloqueado ? dic.myClub.full : dic.myClub.set}
    </button>
  );
}
