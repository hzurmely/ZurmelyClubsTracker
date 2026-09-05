import { clubInfo, overallStats, members, matches, isDemo } from '@/lib/ea';
import { demo } from '@/lib/demo';

/**
 * Junta tudo que a página do clube precisa em uma chamada só.
 * Cada pedaço falha de forma isolada: se o histórico de partidas cair,
 * o resto da página continua de pé.
 */
export async function getClubDossier(platform, clubId) {
  if (isDemo()) {
    return {
      demo: true,
      platform,
      info: demo.club(platform, clubId),
      overall: demo.overall(),
      members: demo.members(),
      matches: demo.matches(clubId),
      error: null,
    };
  }

  const [infoR, overallR, membersR, leagueR, playoffR] = await Promise.allSettled([
    clubInfo(platform, clubId),
    overallStats(platform, clubId),
    members(platform, clubId),
    matches(platform, clubId, 'leagueMatch'),
    matches(platform, clubId, 'playoffMatch'),
  ]);

  const league = leagueR.status === 'fulfilled' ? leagueR.value : [];
  const playoff = playoffR.status === 'fulfilled' ? playoffR.value : [];
  const all = [...league, ...playoff].sort((a, b) => b.timestamp - a.timestamp);

  const info = infoR.status === 'fulfilled' ? infoR.value : null;

  return {
    demo: false,
    platform,
    info,
    overall: overallR.status === 'fulfilled' ? overallR.value : null,
    members: membersR.status === 'fulfilled' ? membersR.value : [],
    matches: all.slice(0, 20),
    error: info
      ? null
      : infoR.status === 'rejected'
        ? infoR.reason?.message || 'Clube não encontrado'
        : 'Clube não encontrado nesta plataforma',
  };
}

/** Pega o bloco de estatística preferido de um jogador, com reserva. */
export function statsOf(member, mode = 'season') {
  if (mode === 'career') return member.career || member.season || null;
  return member.season || member.career || null;
}

/** Derivados que usamos em vários lugares da interface. */
export function summarize(dossier) {
  const o = dossier.overall;
  const ms = dossier.matches || [];
  const played = o?.gamesPlayed || 0;

  const form = ms.slice(0, 10).map((m) => m.result);
  const squad = dossier.members || [];

  // Os destaques usam a carreira quando existe: é o número que as pessoas citam.
  const withStats = squad
    .map((m) => ({ m, s: m.career || m.season }))
    .filter((x) => x.s);

  const best = (key, minGames = 0) =>
    withStats
      .filter((x) => x.s.gamesPlayed >= minGames)
      .sort((a, b) => (b.s[key] || 0) - (a.s[key] || 0))[0] || null;

  const scorer = best('goals');
  const assist = best('assists');
  const rated = best('rating', 5);

  return {
    form,
    golsPorJogo: played ? o.goals / played : 0,
    sofridosPorJogo: played ? o.goalsAgainst / played : 0,
    saldo: (o?.goals || 0) - (o?.goalsAgainst || 0),
    aproveitamento: played ? ((o.wins * 3 + o.ties) / (played * 3)) * 100 : 0,
    topScorer: scorer && { name: scorer.m.name, value: scorer.s.goals },
    topAssist: assist && { name: assist.m.name, value: assist.s.assists },
    topRating: rated && { name: rated.m.name, value: rated.s.rating },
  };
}
