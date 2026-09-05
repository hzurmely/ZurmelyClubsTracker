'use client';

import { useEffect, useState } from 'react';
import { lerMeuClube, salvarMeuClube, limparMeuClube } from '@/lib/meuClube';

/**
 * Botão da página do clube. Marca (ou desmarca) aquele clube como o favorito
 * que aparece na home. Fica tudo no navegador de quem clicou.
 */
export default function DefinirMeuClube({ id, platform, name }) {
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

  // Antes de montar no navegador não dá para saber a preferência, e renderizar
  // um estado chutado causaria aquele piscar feio.
  if (!montado) return null;

  return (
    <button
      type="button"
      className={ehMeu ? 'btn' : 'btn ghost'}
      onClick={() => (ehMeu ? limparMeuClube() : salvarMeuClube({ id, platform, name }))}
      title={ehMeu ? 'Tirar da home' : 'Fixar este clube na home'}
    >
      {ehMeu ? '★ Meu clube' : '☆ Definir como meu clube'}
    </button>
  );
}
