/**
 * Athlete DNA.
 *
 * Takes one player from the squad and answers three questions the raw table
 * does not: what he is good at compared to his teammates, what he has already
 * achieved inside the club, and how his rating behaved over the latest matches.
 *
 * Nothing here invents a number. Everything comes from /members/stats,
 * /members/career/stats and the per match player block, which are the only
 * three places where EA publishes individual performance.
 *
 * Every text that reaches the screen is resolved through the dictionary handed
 * in by the caller, so the same profile renders in either language.
 */

import { posGroup } from '@/lib/format';

const WEIGHT = 3;

/**
 * The six radar axes.
 *
 * They are the same for everyone, goalkeepers included, on purpose. The radar
 * exists to compare players from the same squad, and swapping axes per position
 * would make the shapes incomparable. A keeper shows up with his own shape,
 * short at the front and tall on passing, which is already the right read.
 */
export const AXES = [
  { key: 'gols', kind: 'perGame', field: 'goals' },
  { key: 'finalizacao', kind: 'pct', field: 'shotSuccessRate' },
  { key: 'assistencias', kind: 'perGame', field: 'assists' },
  { key: 'passe', kind: 'pct', field: 'passSuccessRate' },
  { key: 'desarme', kind: 'pct', field: 'tackleSuccessRate' },
  { key: 'nota', kind: 'rating', field: 'rating' },
];

/** Raw axis value for a player, already per game where that applies. */
function axisValue(axis, s) {
  if (!s) return 0;
  const raw = s[axis.field];
  if (!Number.isFinite(raw)) return 0;
  if (axis.kind === 'perGame') return s.gamesPlayed ? raw / s.gamesPlayed : 0;
  return raw;
}

/** How the number reads next to the radar. */
function axisText(axis, value, dic) {
  if (axis.kind === 'pct') return `${Math.round(value)}%`;
  if (axis.kind === 'rating') return value.toFixed(2).replace('.', dic.decimal);
  return dic.dna.perGame(value.toFixed(2).replace('.', dic.decimal));
}

/**
 * Scale from 0 to 100. The top of each axis is the best in the squad for that
 * item, so the shape answers "where does he stand against his teammates",
 * which is the useful question. Rating gets its own treatment: 5.0 is the
 * floor, because a Pro Clubs rating almost never drops below that and without
 * the cut every shape would look the same.
 */
function scale(axis, value, ceiling) {
  if (axis.kind === 'rating') {
    const floor = 5;
    const target = Math.max(ceiling, floor + 0.5);
    if (value <= floor) return 0;
    return Math.max(0, Math.min(100, ((value - floor) / (target - floor)) * 100));
  }
  if (!ceiling) return 0;
  return Math.max(0, Math.min(100, (value / ceiling) * 100));
}

/** The stat block for the requested view, with a fallback to the other one. */
function block(m, mode) {
  if (mode === 'career') return m.career || m.season || null;
  return m.season || m.career || null;
}

/* ------------------------------------------------------------------ */
/* Medals                                                              */
/* ------------------------------------------------------------------ */

/** Best in the squad for one field, respecting a minimum sample. */
function leader(list, field, minGames = 0) {
  const candidates = list
    .filter((x) => x.s && (x.s.gamesPlayed || 0) >= minGames && (x.s[field] || 0) > 0)
    .sort((a, b) => (b.s[field] || 0) - (a.s[field] || 0));
  return candidates[0] || null;
}

/** Longest run of consecutive matches with a goal or an assist. */
function longestStreak(matches) {
  let current = 0;
  let best = 0;
  for (const m of matches) {
    if ((m.goals || 0) + (m.assists || 0) > 0) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

function milestone(value, steps, build) {
  const reached = [...steps].reverse().find((s) => value >= s);
  return reached ? build(reached) : null;
}

/**
 * Medals come in two kinds. The squad ones depend on who is in the club today
 * and can change hands; the milestones belong to the player and never leave.
 */
function buildMedals({ player, s, squad, matches, mode, dic }) {
  const medals = [];
  const me = player.name;
  const withStats = squad.map((m) => ({ m, s: block(m, mode) })).filter((x) => x.s);
  const t = dic.dna.medals;

  const contests = [
    { field: 'goals', min: 0, icon: '🥅', label: t.topScorer },
    { field: 'assists', min: 0, icon: '🎯', label: t.playmaker },
    { field: 'mom', min: 0, icon: '⭐', label: t.mom },
    { field: 'rating', min: 5, icon: '📈', label: t.rating },
    { field: 'gamesPlayed', min: 0, icon: '🧱', label: t.games },
    { field: 'passSuccessRate', min: 5, icon: '🎼', label: t.pass, pct: true },
    { field: 'tackleSuccessRate', min: 5, icon: '🛡️', label: t.tackle, pct: true },
    { field: 'shotSuccessRate', min: 5, icon: '🎱', label: t.shot, pct: true },
  ];

  for (const c of contests) {
    const owner = leader(withStats, c.field, c.min);
    if (!owner || owner.m.name !== me) continue;
    const v = owner.s[c.field];
    const written = c.pct
      ? `${Math.round(v)}%`
      : c.field === 'rating'
        ? v.toFixed(2).replace('.', dic.decimal)
        : String(v);
    medals.push({
      tipo: 'elenco',
      icone: c.icon,
      titulo: c.label.title,
      detalhe: `${written} ${c.label.unit}`,
    });
  }

  if (s) {
    const m1 = milestone(s.gamesPlayed || 0, [25, 50, 100, 200, 400], (n) => ({
      tipo: 'marco',
      icone: '🏟️',
      titulo: t.milestoneGames(n),
      detalhe: t.totalOf(s.gamesPlayed),
    }));
    if (m1) medals.push(m1);

    const m2 = milestone(s.goals || 0, [10, 25, 50, 100, 200], (n) => ({
      tipo: 'marco',
      icone: '⚽',
      titulo: t.milestoneGoals(n),
      detalhe: t.totalOf(s.goals),
    }));
    if (m2) medals.push(m2);

    const m3 = milestone(s.assists || 0, [10, 25, 50, 100], (n) => ({
      tipo: 'marco',
      icone: '🅰️',
      titulo: t.milestoneAssists(n),
      detalhe: t.totalOf(s.assists),
    }));
    if (m3) medals.push(m3);

    if ((s.gamesPlayed || 0) >= 10 && (s.rating || 0) >= 8) {
      medals.push({
        tipo: 'marco',
        icone: '💎',
        titulo: t.rating8,
        detalhe: t.rating8Detail(s.rating.toFixed(2).replace('.', dic.decimal), s.gamesPlayed),
      });
    }
    if ((s.cleanSheetsGK || 0) >= 5) {
      medals.push({
        tipo: 'marco',
        icone: '🧤',
        titulo: t.cleanSheets,
        detalhe: t.cleanSheetsDetail(s.cleanSheetsGK),
      });
    }
  }

  if (matches.length) {
    const streak = longestStreak(matches);
    if (streak >= 3) {
      medals.push({
        tipo: 'recente',
        icone: '🔥',
        titulo: t.streak,
        detalhe: t.streakDetail(streak),
      });
    }
    const bestRating = matches.reduce((a, b) => (b.rating > a.rating ? b : a), matches[0]);
    if (bestRating.rating >= 9) {
      medals.push({
        tipo: 'recente',
        icone: '🎬',
        titulo: t.gala,
        detalhe: t.galaDetail(
          bestRating.rating.toFixed(2).replace('.', dic.decimal),
          bestRating.adversario,
        ),
      });
    }
    const haul = matches.find((m) => (m.goals || 0) >= 3);
    if (haul) {
      medals.push({
        tipo: 'recente',
        icone: '🎩',
        titulo: haul.goals >= 4 ? t.poker : t.hattrick,
        detalhe: t.hattrickDetail(haul.goals, haul.adversario),
      });
    }
  }

  const weight = { elenco: 0, recente: 1, marco: 2 };
  return medals.sort((a, b) => weight[a.tipo] - weight[b.tipo]);
}

/* ------------------------------------------------------------------ */
/* Archetype                                                           */
/* ------------------------------------------------------------------ */

/** Which archetype each pair of leading axes maps to. */
const RECIPES = [
  { pair: ['gols', 'finalizacao'], key: 'Finalizador' },
  { pair: ['gols', 'assistencias'], key: 'Decisivo' },
  { pair: ['assistencias', 'passe'], key: 'Criador' },
  { pair: ['assistencias', 'finalizacao'], key: 'SegundoAtacante' },
  { pair: ['passe', 'desarme'], key: 'MeioDeLigacao' },
  { pair: ['desarme', 'nota'], key: 'Marcador' },
  { pair: ['gols', 'passe'], key: 'Camisa10' },
  { pair: ['gols', 'nota'], key: 'ReferenciaDeArea' },
  { pair: ['passe', 'nota'], key: 'Metronomo' },
  { pair: ['desarme', 'finalizacao'], key: 'BoxToBox' },
  { pair: ['assistencias', 'desarme'], key: 'Ala' },
  { pair: ['assistencias', 'nota'], key: 'Articulador' },
  { pair: ['finalizacao', 'nota'], key: 'Oportunista' },
  { pair: ['finalizacao', 'passe'], key: 'AtacanteDeJogo' },
  { pair: ['gols', 'desarme'], key: 'Guerreiro' },
  { pair: ['desarme', 'passe'], key: 'PrimeiroHomem' },
];

/**
 * Reference ceilings, used only when the squad is too small to serve as a
 * comparison. With two players in the club everybody is the best at something,
 * and the relative scale would make anyone look complete.
 */
const REFERENCE = {
  gols: 0.8,
  finalizacao: 50,
  assistencias: 0.6,
  passe: 88,
  desarme: 65,
  nota: 8.5,
};

function archetype(axes, group, squadSize, dic) {
  const comparable = squadSize >= 3;
  const strength = (a) =>
    comparable ? a.escala : Math.min(100, (a.valor / (REFERENCE[a.chave] || 1)) * 100);
  const ordered = [...axes].sort((a, b) => strength(b) - strength(a));
  const top = ordered.slice(0, 2).map((a) => a.chave);
  const mean = axes.reduce((sum, a) => sum + strength(a), 0) / (axes.length || 1);
  const deviation = Math.sqrt(
    axes.reduce((sum, a) => sum + (strength(a) - mean) ** 2, 0) / (axes.length || 1),
  );

  // The rest of the code reads titulo/texto, so the dictionary shape is
  // normalised here in one place instead of at every call site.
  const shape = (a) => ({ titulo: a.title, texto: a.text });

  if (group === 'gk') return shape(dic.dna.archetypes.Goleiro);
  if (comparable && deviation < 14 && mean > 45) return shape(dic.dna.archetypes.Completo);

  const found = RECIPES.find((r) => r.pair.includes(top[0]) && r.pair.includes(top[1]));
  if (found) return shape(dic.dna.archetypes[found.key]);

  return shape(dic.dna.archetypeFallback(ordered[0].rotulo));
}

/* ------------------------------------------------------------------ */
/* Player matches                                                      */
/* ------------------------------------------------------------------ */

/** Slices the club history by player name, oldest first. */
export function partidasDoJogador(matches, nome) {
  const list = [];
  for (const m of matches || []) {
    const me = (m.players || []).find((p) => p.name === nome);
    if (!me) continue;
    list.push({
      matchId: m.matchId,
      timestamp: m.timestamp,
      tipo: m.matchType,
      adversario: m.opponent?.name || '',
      adversarioId: m.opponent?.clubId || null,
      placar: `${m.goalsFor} x ${m.goalsAgainst}`,
      resultado: m.result,
      rating: me.rating || 0,
      goals: me.goals || 0,
      assists: me.assists || 0,
      shots: me.shots || 0,
      passe: me.passAttempts ? (me.passesMade / me.passAttempts) * 100 : null,
      desarme: me.tackleAttempts ? (me.tacklesMade / me.tackleAttempts) * 100 : null,
      saves: me.saves || 0,
      sofridos: me.goalsConceded || 0,
      mom: me.mom,
      minutos: me.minutos || 0,
      pos: me.pos || '',
    });
  }
  return list.sort((a, b) => a.timestamp - b.timestamp);
}

/* ------------------------------------------------------------------ */
/* Full profile                                                        */
/* ------------------------------------------------------------------ */

/**
 * Puts it all together. Returns null when the player is not in the squad, so
 * the page can show an honest 404 instead of an empty profile.
 */
export function perfilDoJogador({ members, matches, nome, modo = 'season', dic }) {
  const squad = members || [];
  const player = squad.find((m) => m.name === nome);
  if (!player) return null;

  const s = block(player, modo);
  const hasSeason = squad.some((m) => m.season);
  const hasCareer = squad.some((m) => m.career);

  // The radar only makes sense on the season view: career carries no
  // percentage at all, so three of the six axes would sit at zero.
  const withSeason = squad.map((m) => ({ m, s: m.season })).filter((x) => x.s);
  const mine = player.season;

  const axes = AXES.map((axis) => {
    const values = withSeason.map((x) => axisValue(axis, x.s));
    const ceiling = values.length ? Math.max(...values) : 0;
    const mineValue = axisValue(axis, mine);
    const squadMean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const sorted = [...values].sort((a, b) => b - a);
    return {
      chave: axis.key,
      rotulo: dic.dna.axes[axis.key],
      valor: mineValue,
      texto: axisText(axis, mineValue, dic),
      escala: scale(axis, mineValue, ceiling),
      escalaElenco: scale(axis, squadMean, ceiling),
      textoElenco: axisText(axis, squadMean, dic),
      posicao: sorted.indexOf(mineValue) + 1,
      de: values.length,
    };
  });

  const playerMatches = partidasDoJogador(matches, nome);
  const medals = buildMedals({ player, s, squad, matches: playerMatches, mode: modo, dic });
  const group = posGroup(player.pos);

  const rated = playerMatches.filter((p) => p.rating > 0);
  const summary = rated.length
    ? {
        jogos: playerMatches.length,
        notaMedia: rated.reduce((a, p) => a + p.rating, 0) / rated.length,
        gols: playerMatches.reduce((a, p) => a + p.goals, 0),
        assistencias: playerMatches.reduce((a, p) => a + p.assists, 0),
        mom: playerMatches.filter((p) => p.mom).length,
        melhor: rated.reduce((a, b) => (b.rating > a.rating ? b : a)),
        vitorias: playerMatches.filter((p) => p.resultado === 'V').length,
      }
    : null;

  return {
    jogador: {
      name: player.name,
      pos: player.pos,
      grupo: group,
      proOverall: player.proOverall || 0,
      proHeight: player.proHeight || 0,
    },
    modo,
    temTemporada: hasSeason,
    temCarreira: hasCareer,
    stats: s,
    season: player.season,
    career: player.career,
    temRadar: Boolean(mine) && withSeason.length > 0,
    eixos: axes,
    arquetipo: archetype(axes, group, withSeason.length, dic),
    medalhas: medals,
    partidas: playerMatches,
    resumo: summary,
    elenco: withSeason.length,
  };
}

export { WEIGHT };
