/**
 * Match analysis.
 *
 * EA does not publish team stats per match: it publishes one line per player.
 * So every team number here is added up from the players, and whatever EA does
 * not return (possession, for one) is not invented. The closest thing to it is
 * the share of passes attempted, which shows up under that name and not
 * pretending to be possession.
 *
 * Every text goes through the dictionary handed in by the caller.
 */

import { posGroup } from '@/lib/format';

/** Adds the whole team up from the player lines. */
export function totaisDoTime(jogadores, gols) {
  const list = jogadores || [];
  const sum = (field) => list.reduce((t, p) => t + (p[field] || 0), 0);
  const rated = list.filter((p) => p.rating > 0);

  const passAttempts = sum('passAttempts');
  const tackleAttempts = sum('tackleAttempts');

  return {
    gols,
    jogadores: list.length,
    finalizacoes: sum('shots'),
    assistencias: sum('assists'),
    passesCertos: sum('passesMade'),
    passesTentados: passAttempts,
    acertoPasse: passAttempts ? (sum('passesMade') / passAttempts) * 100 : null,
    desarmesCertos: sum('tacklesMade'),
    desarmesTentados: tackleAttempts,
    acertoDesarme: tackleAttempts ? (sum('tacklesMade') / tackleAttempts) * 100 : null,
    defesas: sum('saves'),
    vermelhos: sum('redCards'),
    nota: rated.length ? rated.reduce((t, p) => t + p.rating, 0) / rated.length : 0,
    aproveitamentoChute: sum('shots') ? (gols / sum('shots')) * 100 : null,
  };
}

/** Man of the match: the EA flag beats the rating whenever it exists. */
function bestOnPitch(jogadores) {
  const list = (jogadores || []).filter((p) => p.rating > 0);
  if (!list.length) return null;
  return list.find((p) => p.mom) || list.reduce((a, b) => (b.rating > a.rating ? b : a));
}

/**
 * The comparison rows.
 *
 * Each kind gets its own ruler, otherwise the bar lies. Counts split the space
 * between the two sides; percentages fill each half with their own value; the
 * rating uses the 5 to 10 range, which is where a Pro Clubs rating lives.
 */
export function montarComparativo(meu, dele, dic) {
  const labels = dic.match.comparison;
  const rows = [
    { chave: 'gols', rotulo: labels.gols, tipo: 'contagem', meu: meu.gols, dele: dele.gols },
    { chave: 'finalizacoes', rotulo: labels.finalizacoes, tipo: 'contagem', meu: meu.finalizacoes, dele: dele.finalizacoes },
    { chave: 'passes', rotulo: labels.passes, tipo: 'contagem', meu: meu.passesTentados, dele: dele.passesTentados },
    { chave: 'acertoPasse', rotulo: labels.acertoPasse, tipo: 'pct', meu: meu.acertoPasse, dele: dele.acertoPasse },
    { chave: 'desarmes', rotulo: labels.desarmes, tipo: 'contagem', meu: meu.desarmesCertos, dele: dele.desarmesCertos },
    { chave: 'acertoDesarme', rotulo: labels.acertoDesarme, tipo: 'pct', meu: meu.acertoDesarme, dele: dele.acertoDesarme },
    { chave: 'defesas', rotulo: labels.defesas, tipo: 'contagem', meu: meu.defesas, dele: dele.defesas },
    { chave: 'nota', rotulo: labels.nota, tipo: 'nota', meu: meu.nota, dele: dele.nota },
  ];

  return rows
    .filter((l) => Number.isFinite(l.meu) || Number.isFinite(l.dele))
    .map((l) => {
      const a = Number.isFinite(l.meu) ? l.meu : 0;
      const b = Number.isFinite(l.dele) ? l.dele : 0;
      let escalaMeu = 0;
      let escalaDele = 0;

      if (l.tipo === 'contagem') {
        const total = a + b;
        escalaMeu = total ? (a / total) * 100 : 0;
        escalaDele = total ? (b / total) * 100 : 0;
      } else if (l.tipo === 'pct') {
        escalaMeu = Math.max(0, Math.min(100, a));
        escalaDele = Math.max(0, Math.min(100, b));
      } else {
        const band = (v) => Math.max(0, Math.min(100, ((v - 5) / 5) * 100));
        escalaMeu = band(a);
        escalaDele = band(b);
      }

      const write = (v) => {
        if (!Number.isFinite(v)) return dic.common.na;
        if (l.tipo === 'pct') return `${Math.round(v)}%`;
        if (l.tipo === 'nota') return v.toFixed(2).replace('.', dic.decimal);
        return String(v);
      };

      return {
        ...l,
        escalaMeu,
        escalaDele,
        textoMeu: write(l.meu),
        textoDele: write(l.dele),
        vencedor: a === b ? null : a > b ? 'meu' : 'dele',
      };
    });
}

/* ------------------------------------------------------------------ */
/* Reading the game                                                    */
/* ------------------------------------------------------------------ */

function shortName(name) {
  return (name || '').length > 24 ? `${name.slice(0, 22)}…` : name;
}

/**
 * Three or four sentences about what happened, each tied to a number that is
 * on the page. No generic filler: when the data does not support the read, the
 * sentence does not make it in.
 */
export function leituraDaPartida({ partida, meu, dele, mvpMeu, nomeMeu, nomeDele, dic }) {
  const out = [];
  const t = dic.match.reading;
  // Without the opponent lines there is nothing to compare, so the sentences
  // stay limited to what belongs to our own team.
  const hasOpponent = dele.jogadores > 0;
  const margin = Math.abs(partida.goalsFor - partida.goalsAgainst);
  const score = `${partida.goalsFor} - ${partida.goalsAgainst}`;

  if (partida.result === 'V') {
    out.push(margin >= 3 ? t.winBig(score) : margin === 1 ? t.winNarrow(score) : t.win(score));
  } else if (partida.result === 'D') {
    out.push(margin >= 3 ? t.lossBig(score) : margin === 1 ? t.lossNarrow(score) : t.loss(score));
  } else {
    out.push(t.draw(score));
  }

  // Finishing efficiency, which is what separates creating from settling it.
  // The volume comparison only enters with a real gap: two shots of difference
  // is not a story.
  if (meu.finalizacoes > 0) {
    const conv = Math.round(meu.aproveitamentoChute);
    const gap = Math.abs(meu.finalizacoes - dele.finalizacoes) >= 4 && hasOpponent;
    if (partida.result === 'V' && gap && meu.finalizacoes < dele.finalizacoes) {
      out.push(t.wonShootingLess(meu.finalizacoes, dele.finalizacoes, conv));
    } else if (partida.result === 'D' && gap && meu.finalizacoes > dele.finalizacoes) {
      out.push(t.lostShootingMore(meu.finalizacoes, partida.goalsFor, conv));
    } else if (conv >= 40) {
      out.push(t.clinical(conv, meu.finalizacoes));
    } else if (conv <= 15 && meu.finalizacoes >= 8) {
      out.push(t.wasteful(meu.finalizacoes, conv));
    }
  }

  // Who kept the ball, measured by the share of passes attempted.
  const totalPasses = meu.passesTentados + dele.passesTentados;
  if (hasOpponent && totalPasses >= 100) {
    const share = Math.round((meu.passesTentados / totalPasses) * 100);
    if (share >= 62) out.push(t.hadTheBall(share, shortName(nomeMeu)));
    else if (share <= 38) out.push(t.withoutTheBall(share, shortName(nomeDele)));
  }

  // Keeper and defence.
  if (meu.defesas >= 5) {
    out.push(t.keeperHeld(meu.defesas));
  } else if (hasOpponent && partida.goalsAgainst >= 4 && dele.finalizacoes > 0) {
    out.push(t.defenseFailed(partida.goalsAgainst, dele.finalizacoes));
  }

  if (mvpMeu) {
    const done = [];
    if (mvpMeu.goals) done.push(`${mvpMeu.goals} ${mvpMeu.goals === 1 ? dic.common.goal : dic.common.goals}`);
    if (mvpMeu.assists) done.push(`${mvpMeu.assists} ${mvpMeu.assists === 1 ? dic.common.assist : dic.common.assists}`);
    const rating = mvpMeu.rating.toFixed(2).replace('.', dic.decimal);
    out.push(done.length ? t.bestWith(mvpMeu.name, rating, done.join(t.and)) : t.best(mvpMeu.name, rating));
  }

  return out.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Head to head                                                        */
/* ------------------------------------------------------------------ */

/** How the club fares against this opponent inside what EA still keeps. */
export function retrospecto(todas, adversarioId, matchIdAtual) {
  if (!adversarioId) return null;
  const games = (todas || [])
    .filter((m) => m.opponent?.clubId === adversarioId)
    .sort((a, b) => b.timestamp - a.timestamp);
  if (games.length < 2) return null;

  return {
    jogos: games.length,
    v: games.filter((m) => m.result === 'V').length,
    e: games.filter((m) => m.result === 'E').length,
    d: games.filter((m) => m.result === 'D').length,
    golsPro: games.reduce((t, m) => t + m.goalsFor, 0),
    golsContra: games.reduce((t, m) => t + m.goalsAgainst, 0),
    lista: games.map((m) => ({ ...m, atual: m.matchId === matchIdAtual })),
  };
}

/* ------------------------------------------------------------------ */

/** Everything the match page shows. */
export function analisarPartida({ partida, todas, clube, dic }) {
  if (!partida) return null;

  const homeName = partida.clube?.name || clube?.name || '';
  const awayName = partida.opponent?.name || '';

  const mine = totaisDoTime(partida.players, partida.goalsFor);
  const theirs = totaisDoTime(partida.opponentPlayers, partida.goalsAgainst);

  const mvpMine = bestOnPitch(partida.players);
  const mvpTheirs = bestOnPitch(partida.opponentPlayers);

  return {
    partida,
    times: {
      meu: {
        nome: homeName,
        clubId: partida.clube?.clubId || clube?.clubId || null,
        customKit: partida.clube?.customKit || clube?.customKit || null,
        gols: partida.goalsFor,
        jogadores: partida.players || [],
        totais: mine,
        mvp: mvpMine,
      },
      dele: {
        nome: awayName,
        clubId: partida.opponent?.clubId || null,
        customKit: partida.opponent?.customKit || null,
        gols: partida.goalsAgainst,
        jogadores: partida.opponentPlayers || [],
        totais: theirs,
        mvp: mvpTheirs,
      },
    },
    comparativo: montarComparativo(mine, theirs, dic),
    leitura: leituraDaPartida({
      partida,
      meu: mine,
      dele: theirs,
      mvpMeu: mvpMine,
      nomeMeu: homeName,
      nomeDele: awayName,
      dic,
    }),
    retrospecto: retrospecto(todas, partida.opponent?.clubId, partida.matchId),
    temAdversario: (partida.opponentPlayers || []).length > 0,
  };
}

/** Table helper: groups by sector, keeper first. */
export function ordenarElenco(jogadores) {
  const weight = { gk: 0, def: 1, mid: 2, att: 3 };
  return [...(jogadores || [])].sort(
    (a, b) => (weight[posGroup(a.pos)] ?? 9) - (weight[posGroup(b.pos)] ?? 9) || b.rating - a.rating,
  );
}
