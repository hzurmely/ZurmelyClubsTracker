import { clubInfo, overallStats, members, matches, isDemo } from '@/lib/ea';
import { demo } from '@/lib/demo';

/**
 * Junta tudo que a página do clube precisa em uma chamada só.
 * Cada pedaço falha de forma isolada: se o historico de partidas cair,
 * o resto da pagina continua de pe.
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

/** Derivados que usamos em vários lugares da interface. */
export function summarize(dossier) {
  const o = dossier.overall;
  const ms = dossier.matches || [];
  const played = o?.gamesPlayed || 0;

  const form = ms.slice(0, 10).map((m) => m.result);
  const golsPorJogo = played ? (o.goals / played) : 0;
  const sofridosPorJogo = played ? (o.goalsAgainst / played) : 0;

  const squad = dossier.members || [];
  const topScorer = [...squad].sort((a, b) => b.goals - a.goals)[0] || null;
  const topAssist = [...squad].sort((a, b) => b.assists - a.assists)[0] || null;
  const topRating = [...squad]
    .filter((p) => p.gamesPlayed >= 5)
    .sort((a, b) => b.ratingAve - a.ratingAve)[0] || null;

  return {
    form,
    golsPorJogo,
    sofridosPorJogo,
    saldo: (o?.goals || 0) - (o?.goalsAgainst || 0),
    aproveitamento: played ? ((o.wins * 3 + o.ties) / (played * 3)) * 100 : 0,
    topScorer,
    topAssist,
    topRating,
  };
}
