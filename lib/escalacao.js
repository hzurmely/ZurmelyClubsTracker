/**
 * Escalação ideal.
 *
 * A ideia é responder "quem são os onze mais confiáveis deste clube", e não
 * simplesmente "quem tem a maior nota". Nota média sozinha engana: quem jogou
 * duas partidas e foi bem aparece na frente de quem sustenta o nível há
 * quarenta jogos.
 *
 * Por isso a ordenação usa uma média encolhida na direção da média do elenco.
 * Quanto menos jogos o jogador tem, mais o número dele é puxado para o meio;
 * conforme os jogos aumentam, o peso da própria nota domina. É o mesmo truque
 * que rankings de esporte usam para não deixar amostra pequena no topo.
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

/** Junta o recorte escolhido (temporada ou carreira) com o que vem fora dele. */
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

/** Média de nota do elenco, ponderada por jogos. É o ponto de atração da fórmula. */
export function mediaDoElenco(jogadores) {
  const totalJogos = jogadores.reduce((soma, j) => soma + j.jogos, 0);
  if (!totalJogos) return 0;
  const totalNotas = jogadores.reduce((soma, j) => soma + j.nota * j.jogos, 0);
  return totalNotas / totalJogos;
}

/** Nota ajustada pelo tamanho da amostra. É por ela que a escalação é montada. */
export function consistencia(jogador, media) {
  if (!jogador.jogos) return 0;
  return (jogador.nota * jogador.jogos + media * PESO) / (jogador.jogos + PESO);
}

/**
 * Monta o time. Cada vaga puxa o melhor jogador ainda livre do setor dela; se o
 * setor acabar, a vaga recebe o melhor sobrando de qualquer setor e fica
 * marcada como improviso, que é a informação útil de verdade para quem escala.
 */
export function montarEscalacao(members, formacaoId = '3-5-2', modo = 'season') {
  const formacao = FORMACOES[formacaoId] || FORMACOES['3-5-2'];
  const jogadores = normalizar(members, modo);
  const media = mediaDoElenco(jogadores);

  const ranqueados = jogadores
    .map((j) => ({ ...j, score: consistencia(j, media) }))
    .sort((a, b) => b.score - a.score || b.jogos - a.jogos);

  const usados = new Set();
  const escalacao = formacao.vagas.map((vaga) => {
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

  return { formacao, escalacao, reservas, media, elenco: ranqueados.length };
}
