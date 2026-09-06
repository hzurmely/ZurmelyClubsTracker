/**
 * Local match archive.
 *
 * EA only publishes the latest league and playoff matches, roughly twenty of
 * them, and drops the older ones for good. The desktop program watches that
 * window and writes every match it has ever seen into a folder, so the history
 * keeps growing long after EA has forgotten it. Open the program once a week
 * and the archive fills itself.
 *
 * This is deliberately desktop only. The published site runs on serverless
 * functions with a throwaway filesystem, so anything written there would be
 * gone on the next request. The program sets ZCT_DATA_DIR and that is the only
 * switch: with no folder configured every function here turns into a no-op and
 * the site behaves exactly as before.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Where the archive lives, or null when this is not the desktop program. */
export function pastaArquivo() {
  const dir = process.env.ZCT_DATA_DIR;
  return dir && dir.trim() ? dir.trim() : null;
}

export function arquivoAtivo() {
  return Boolean(pastaArquivo());
}

/** One file per club. The name carries platform and id so it is readable. */
function caminhoDoClube(platform, clubId) {
  const base = pastaArquivo();
  if (!base) return null;
  const seguro = `${platform}-${clubId}`.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(base, `${seguro}.json`);
}

export function lerHistorico(platform, clubId) {
  const arquivo = caminhoDoClube(platform, clubId);
  if (!arquivo) return [];
  try {
    if (!fs.existsSync(arquivo)) return [];
    const dado = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    return Array.isArray(dado?.partidas) ? dado.partidas : [];
  } catch {
    // A corrupt or half written file must not take the page down: the club
    // still works, it just starts collecting again from what EA has now.
    return [];
  }
}

/**
 * Merges what EA just returned into what is already on disk.
 *
 * Deduplication is by matchId. When the same match exists on both sides the
 * richer record wins: the club page fetches without the opponent lineup, the
 * match page fetches with it, and whichever ran last should not throw away the
 * more complete copy.
 */
export function juntarHistorico(guardadas, novas) {
  const porId = new Map();

  for (const m of guardadas || []) {
    if (m?.matchId) porId.set(String(m.matchId), m);
  }

  for (const m of novas || []) {
    if (!m?.matchId) continue;
    const id = String(m.matchId);
    const antiga = porId.get(id);
    if (!antiga) {
      porId.set(id, m);
      continue;
    }
    const antigaTemAdversario = (antiga.opponentPlayers || []).length > 0;
    const novaTemAdversario = (m.opponentPlayers || []).length > 0;
    porId.set(id, novaTemAdversario || !antigaTemAdversario ? m : antiga);
  }

  return [...porId.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Writes the merged history back. Writes to a temporary file and renames, so a
 * crash halfway through cannot leave a truncated archive behind.
 */
export function guardarHistorico(platform, clubId, partidas, nomeDoClube = '') {
  const arquivo = caminhoDoClube(platform, clubId);
  if (!arquivo) return partidas;

  const juntas = juntarHistorico(lerHistorico(platform, clubId), partidas);

  try {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const corpo = JSON.stringify(
      {
        clubId: String(clubId),
        platform,
        name: nomeDoClube,
        atualizado: new Date().toISOString(),
        partidas: juntas,
      },
      null,
      1,
    );
    const temporario = `${arquivo}.tmp`;
    fs.writeFileSync(temporario, corpo, 'utf8');
    fs.renameSync(temporario, arquivo);
  } catch {
    // No permission, disk full, folder gone: the page carries on with what it
    // has in memory. Losing the archive is not worth losing the page.
  }

  return juntas;
}

/** How many matches are on disk for a club, for the note under the list. */
export function tamanhoDoArquivo(platform, clubId) {
  return lerHistorico(platform, clubId).length;
}
