/**
 * "Meu clube" guardado no navegador.
 *
 * Antes isso dependia de uma variável de ambiente, o que só servia para quem
 * roda o projeto na própria máquina. Agora quem usa o site (ou o programa de
 * desktop) escolhe o clube na tela e a preferência fica no localStorage, que é
 * por navegador e por pessoa. Nada disso sai do computador de quem usa.
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
    // Navegador sem armazenamento (aba anônima com tudo bloqueado). Segue a vida.
  }
}

export function limparMeuClube() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CHAVE);
    window.dispatchEvent(new Event('zct:meu-clube'));
  } catch {
    // idem
  }
}
