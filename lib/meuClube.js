/**
 * Favourite clubs, kept in the browser.
 *
 * This used to depend on an environment variable, which only helped whoever
 * runs the project on their own machine. Now whoever uses the site (or the
 * desktop program) picks the clubs on screen and the preference lives in
 * localStorage, which is per browser and per person. None of it leaves the
 * user computer.
 *
 * Up to three clubs fit. Three is a deliberate ceiling: the home page shows
 * them as full cards with live numbers, and each one costs a request to EA, so
 * an unbounded list would turn the home page into a slow wall of cards.
 */

const CHAVE = 'zct:meus-clubes';
/** The single club key used before this became a list. Read once, then dropped. */
const CHAVE_ANTIGA = 'zct:meu-clube';

export const LIMITE = 3;

function normalizar(dado) {
  if (!dado || !dado.id) return null;
  return {
    id: String(dado.id),
    platform: dado.platform || 'common-gen5',
    name: dado.name || '',
  };
}

function gravar(lista) {
  window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  window.dispatchEvent(new Event('zct:meu-clube'));
}

/**
 * Reads the list. Anyone who had a club saved before the list existed keeps it:
 * the old key is migrated on the first read and then removed, so nobody loses
 * their club to an update.
 */
export function lerMeusClubes() {
  if (typeof window === 'undefined') return [];
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (cru) {
      const lista = JSON.parse(cru);
      if (Array.isArray(lista)) return lista.map(normalizar).filter(Boolean).slice(0, LIMITE);
    }

    const antigo = window.localStorage.getItem(CHAVE_ANTIGA);
    if (antigo) {
      const um = normalizar(JSON.parse(antigo));
      if (um) {
        window.localStorage.setItem(CHAVE, JSON.stringify([um]));
        window.localStorage.removeItem(CHAVE_ANTIGA);
        return [um];
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function mesmoClube(a, b) {
  return Boolean(a && b && String(a.id) === String(b.id) && a.platform === b.platform);
}

export function ehMeuClube(id, platform) {
  return lerMeusClubes().some((c) => mesmoClube(c, { id, platform }));
}

export function estaCheio() {
  return lerMeusClubes().length >= LIMITE;
}

/**
 * Adds a club. Returns false when the list is already full, so the button can
 * explain why nothing happened instead of failing silently.
 */
export function salvarMeuClube(clube) {
  if (typeof window === 'undefined') return false;
  const novo = normalizar(clube);
  if (!novo) return false;
  try {
    const lista = lerMeusClubes();
    if (lista.some((c) => mesmoClube(c, novo))) return true;
    if (lista.length >= LIMITE) return false;
    gravar([...lista, novo]);
    return true;
  } catch {
    // Browser with no storage (private tab with everything blocked). Move on.
    return false;
  }
}

/** Removes one club, or every club when called with no arguments. */
export function limparMeuClube(id, platform) {
  if (typeof window === 'undefined') return;
  try {
    if (id === undefined) {
      gravar([]);
      return;
    }
    gravar(lerMeusClubes().filter((c) => !mesmoClube(c, { id, platform })));
  } catch {
    // same as above
  }
}
