import { clubInfo, overallStats, members, matches, isDemo } from '@/lib/ea';
import { demo } from '@/lib/demo';
import { arquivoAtivo, guardarHistorico, nomeArquivado } from '@/lib/arquivo';

/**
 * Gathers everything the club page needs in a single call.
 * Each piece fails on its own: if the match history goes down, the rest of the
 * page stays up.
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
      arquivadas: 0,
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
  const overall = overallR.status === 'fulfilled' ? overallR.value : null;
  const squad = membersR.status === 'fulfilled' ? membersR.value : [];

  /**
   * Did the club stop existing, or is EA having a bad day?
   *
   * The two look alike at first glance, and telling them apart matters: one is
   * permanent and the other passes on its own. For a club id that is gone, EA
   * answers 500 on /clubs/info and answers the other endpoints normally, with
   * nothing inside. So the test is whether the endpoints that carry data all
   * replied and all replied empty. A club that is alive always has a squad and
   * a stats block, even with no games played, so there is no way for a real
   * club to look like this.
   *
   * If EA is simply down, overallStats and the match listings reject instead of
   * answering, and none of this trips.
   *
   * Note that info deliberately does not take part. It is the one call that can
   * still hand back a name long after the club is gone, out of somebody's cache
   * along the way, and trusting it is exactly what made the page render a ghost:
   * an old squad, no matches, no stats.
   */
  const semNada =
    overallR.status === 'fulfilled' &&
    !overall &&
    !squad.length &&
    leagueR.status === 'fulfilled' &&
    playoffR.status === 'fulfilled' &&
    !all.length;

  // In the desktop program the matches EA still shows are folded into the local
  // archive and the page gets the whole history back. On the site there is no
  // archive, so this is the same twenty matches as before.
  let historico = all.slice(0, 20);
  let arquivadas = 0;
  if (arquivoAtivo()) {
    historico = guardarHistorico(platform, clubId, all, info?.name || '');
    arquivadas = historico.length;
  }

  // One exception, and it only ever happens in the desktop program: the club is
  // gone from EA but the archive on this computer still holds its matches. Those
  // are the reason the archive exists, so the page stays and shows them instead
  // of a dead end.
  const sumiu = semNada && !arquivadas;

  /**
   * The club is gone from EA and the archive is all that is left. Rather than a
   * dead end, the page opens on what the archive holds, under the name it last
   * saw. somenteArquivo tells the page to say so.
   */
  let identidade = sumiu ? null : info;
  if (!identidade && arquivadas) {
    const nome = nomeArquivado(platform, clubId);
    identidade = {
      clubId: String(clubId),
      name: nome || `#${clubId}`,
      regionId: null,
      teamId: null,
      customKit: null,
      stadium: '',
      platform,
      somenteArquivo: true,
    };
  }

  return {
    demo: false,
    platform,
    // A club that is gone has no info worth showing, whatever came back.
    info: identidade,
    overall,
    members: squad,
    matches: historico,
    arquivadas,
    sumiu,
    error:
      sumiu || identidade
        ? null
        : infoR.status === 'rejected'
          ? infoR.reason?.message || 'Clube não encontrado'
          : 'Clube não encontrado nesta plataforma',
  };
}

/** Picks a player preferred stat block, with a fallback. */
export function statsOf(member, mode = 'season') {
  if (mode === 'career') return member.career || member.season || null;
  return member.season || member.career || null;
}

/** Derived values used in several places across the interface. */
export function summarize(dossier) {
  const o = dossier.overall;
  const ms = dossier.matches || [];
  const played = o?.gamesPlayed || 0;

  const form = ms.slice(0, 10).map((m) => m.result);
  const squad = dossier.members || [];

  // Highlights use career when it exists: that is the number people quote.
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
