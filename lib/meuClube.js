/**
 * "My club", kept in the browser.
 *
 * This used to depend on an environment variable, which only helped whoever
 * runs the project on their own machine. Now whoever uses the site (or the
 * desktop program) picks the club on screen and the preference lives in
 * localStorage, which is per browser and per person. None of it leaves the
 * user computer.
 */

const CHAVE = 'zct:meu-clube';

export function lerMeuClube() {
  if (typeof window === 'undefined') return null;
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) return null;
    const dado = JSON.parse(cru);
    if (!dado || !dado.id) return null;
    return {
      id: String(dado.id),
      platform: dado.platform || 'common-gen5',
      name: dado.name || '',
    };
  } catch {
    return null;
  }
}

export function salvarMeuClube(clube) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CHAVE,
      JSON.stringify({
        id: String(clube.id),
        platform: clube.platform || 'common-gen5',
        name: clube.name || '',
      }),
    );
    window.dispatchEvent(new Event('zct:meu-clube'));
  } catch {
    // Browser with no storage (private tab with everything blocked). Move on.
  }
}

export function limparMeuClube() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CHAVE);
    window.dispatchEvent(new Event('zct:meu-clube'));
  } catch {
    // same as above
  }
}
