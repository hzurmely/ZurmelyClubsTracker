/**
 * Best eleven.
 *
 * The point is to answer "who are the eleven most reliable players in this
 * club", not simply "who has the highest rating". An average rating on its own
 * misleads: someone who played two matches and did well shows up ahead of a
 * player who has held the level for forty games.
 *
 * So the ordering uses an average shrunk towards the squad mean. The fewer
 * games a player has, the more his number is pulled to the middle; as games
 * pile up, the weight of his own rating takes over. It is the same trick sports
 * rankings use to keep a small sample off the top.
 */

import { posGroup } from '@/lib/format';

const PESO = 3; // jogos "fantasma" na média do elenco. Quanto maior, mais conservador.

export const FORMACOES = {
  '3-5-2': {
    nome: '3-5-2',
    vagas: [
      { grupo: 'gk', x: 50, y: 91 },
      { grupo: 'def', x: 26, y: 72 },
      { grupo: 'def', x: 50, y: 75 },
      { grupo: 'def', x: 74, y: 72 },
      { grupo: 'mid', x: 15, y: 52 },
      { grupo: 'mid', x: 32, y: 49 },
      { grupo: 'mid', x: 50, y: 55 },
      { grupo: 'mid', x: 68, y: 49 },
      { grupo: 'mid', x: 85, y: 52 },
      { grupo: 'att', x: 37, y: 21 },
      { grupo: 'att', x: 63, y: 21 },
    ],
  },
  '4-3-3': {
    nome: '4-3-3',
    vagas: [
      { grupo: 'gk', x: 50, y: 91 },
      { grupo: 'def', x: 16, y: 71 },
      { grupo: 'def', x: 38, y: 75 },
      { grupo: 'def', x: 62, y: 75 },
      { grupo: 'def', x: 84, y: 71 },
      { grupo: 'mid', x: 28, y: 50 },
      { grupo: 'mid', x: 50, y: 54 },
      { grupo: 'mid', x: 72, y: 50 },
      { grupo: 'att', x: 18, y: 24 },
      { grupo: 'att', x: 50, y: 19 },
      { grupo: 'att', x: 82, y: 24 },
    ],
  },
  '4-4-2': {
    nome: '4-4-2',
    vagas: [
      { grupo: 'gk', x: 50, y: 91 },
      { grupo: 'def', x: 16, y: 71 },
      { grupo: 'def', x: 38, y: 75 },
      { grupo: 'def', x: 62, y: 75 },
      { grupo: 'def', x: 84, y: 71 },
      { grupo: 'mid', x: 16, y: 50 },
      { grupo: 'mid', x: 38, y: 53 },
      { grupo: 'mid', x: 62, y: 53 },
      { grupo: 'mid', x: 84, y: 50 },
      { grupo: 'att', x: 37, y: 21 },
      { grupo: 'att', x: 63, y: 21 },
    ],
  },
};

/** Merges the chosen view (season or career) with whatever falls outside it. */
export function normalizar(members, modo = 'season') {
  return (members || [])
    .map((m) => {
      const s = (modo === 'career' ? m.career : m.season) || m.season || m.career;
      if (!s) return null;
      return {
        name: m.name,
        pos: m.pos,
        grupo: posGroup(m.pos),
        proOverall: m.proOverall || 0,
        jogos: s.gamesPlayed || 0,
        gols: s.goals || 0,
        assistencias: s.assists || 0,
        craque: s.mom || 0,
        nota: s.rating || 0,
        passe: s.passSuccessRate ?? null,
        desarme: s.tackleSuccessRate ?? null,
        finalizacao: s.shotSuccessRate ?? null,
        vitorias: s.winRate ?? null,
      };
    })
    .filter(Boolean);
}

/** Squad rating average, weighted by games. It is the anchor of the formula. */
export function mediaDoElenco(jogadores) {
  const totalJogos = jogadores.reduce((soma, j) => soma + j.jogos, 0);
  if (!totalJogos) return 0;
  const totalNotas = jogadores.reduce((soma, j) => soma + j.nota * j.jogos, 0);
  return totalNotas / totalJogos;
}

/** Rating adjusted for sample size. This is what the lineup is built on. */
export function consistencia(jogador, media) {
  if (!jogador.jogos) return 0;
  return (jogador.nota * jogador.jogos + media * PESO) / (jogador.jogos + PESO);
}

/** Spreads N players along a row, between 15% and 85% of the pitch width. */
function espalhar(quantos) {
  if (quantos <= 0) return [];
  if (quantos === 1) return [50];
  const passo = 70 / (quantos - 1);
  return Array.from({ length: quantos }, (_, i) => 15 + i * passo);
}

/**
 * Automatic shape, for the common case: EA only returns players with games on
 * record, and most clubs have well under eleven. Forcing a 3-5-2 in those cases
 * would fill the pitch with empty slots and flag everyone as out of position,
 * which tells nobody anything. Here the rows come out of the squad itself: each
 * sector gets exactly the slots it can fill.
 */
export function layoutAutomatico(jogadores) {
  const ordem = ['gk', 'def', 'mid', 'att'];
  const presentes = ordem.filter((g) => jogadores.some((j) => j.grupo === g));

  // Only the rows that exist take up the pitch. A squad of midfielders and
  // forwards with no keeper must not leave the defensive half empty, otherwise
  // the pitch looks like a half loaded screen.
  const alturas = {};
  presentes.forEach((grupo, i) => {
    alturas[grupo] =
      presentes.length === 1 ? 55 : 84 - i * (62 / (presentes.length - 1));
  });

  const vagas = [];
  for (const grupo of presentes) {
    const doGrupo = jogadores.filter((j) => j.grupo === grupo);
    const xs = espalhar(doGrupo.length);
    doGrupo.forEach((_, i) => vagas.push({ grupo, x: xs[i], y: alturas[grupo] }));
  }
  return vagas;
}

/**
 * Builds the team. Each slot pulls the best player still free from its own
 * sector; when that sector runs out, the slot takes the best player left from
 * any sector and is flagged as out of position, which is the genuinely useful
 * piece of information for whoever picks a team.
 *
 * With fewer than eleven players the chosen formation is ignored and the pitch
 * follows the real squad, for the reason explained in layoutAutomatico.
 */
export function montarEscalacao(members, formacaoId = '3-5-2', modo = 'season') {
  const formacao = FORMACOES[formacaoId] || FORMACOES['3-5-2'];
  const jogadores = normalizar(members, modo);
  const media = mediaDoElenco(jogadores);

  const ranqueados = jogadores
    .map((j) => ({ ...j, score: consistencia(j, media) }))
    .sort((a, b) => b.score - a.score || b.jogos - a.jogos);

  const automatica = ranqueados.length < 11;
  const vagas = automatica ? layoutAutomatico(ranqueados.slice(0, 11)) : formacao.vagas;

  const usados = new Set();
  const escalacao = vagas.map((vaga) => {
    const doSetor = ranqueados.find((j) => !usados.has(j.name) && j.grupo === vaga.grupo);
    if (doSetor) {
      usados.add(doSetor.name);
      return { ...vaga, jogador: doSetor, improviso: false };
    }
    const qualquer = ranqueados.find((j) => !usados.has(j.name));
    if (qualquer) {
      usados.add(qualquer.name);
      return { ...vaga, jogador: qualquer, improviso: true };
    }
    return { ...vaga, jogador: null, improviso: false };
  });

  const reservas = ranqueados.filter((j) => !usados.has(j.name));

  return { formacao, escalacao, reservas, media, elenco: ranqueados.length, automatica };
}
