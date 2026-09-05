/**
 * Dados de demonstração. Usados apenas quando EA_DEMO=1 no .env.local.
 * Servem para desenvolver o layout sem depender da API da EA (que cai com
 * alguma frequência). O site sempre mostra um aviso quando está neste modo.
 *
 * O formato aqui imita o que a EA devolve de verdade, inclusive as cores de
 * uniforme como inteiro decimal do RGB.
 */

const KIT = {
  kitColor1: '2325983',
  kitColor2: '16724787',
  crestColor: '15921906',
  crestAssetId: '99160419',
  stadName: 'Arena Zurmely',
  customKitId: '7509',
};

const CLUBS = {
  1001: { clubId: '1001', name: 'FURIA VIRTUAL FC', regionId: 5, customKit: KIT },
  1002: { clubId: '1002', name: 'REAL BOTECO', regionId: 5, customKit: KIT },
  1003: { clubId: '1003', name: 'PENTA UNITED', regionId: 5, customKit: KIT },
  1004: { clubId: '1004', name: 'CANARINHO ESPORTS', regionId: 5, customKit: KIT },
};

// nome, pos, J, G, A, nota, passe%, desarme%, finaliz%, vitorias%, craque, vermelhos
const PLAYERS = [
  ['Muralha', 'goalkeeper', 61, 0, 1, 6.9, 88.2, 74, 0, 62, 8, 0],
  ['Zaga_BR', 'defender', 58, 2, 4, 7.1, 86.4, 81, 22, 64, 4, 2],
  ['Pilar99', 'defender', 54, 1, 3, 7.0, 84.9, 80, 20, 61, 3, 2],
  ['Lateral_Voador', 'defender', 49, 6, 17, 7.4, 82.1, 71, 26, 59, 5, 1],
  ['RB_Turbo', 'defender', 47, 5, 15, 7.3, 81.0, 70, 24, 58, 4, 0],
  ['Cerebro', 'midfielder', 60, 7, 22, 7.8, 91.3, 76, 31, 67, 9, 1],
  ['Maestro10', 'midfielder', 62, 34, 51, 8.4, 89.7, 55, 44, 71, 21, 0],
  ['Camisa8', 'midfielder', 55, 19, 29, 7.9, 88.1, 64, 38, 66, 12, 1],
  ['Ponta_Rapida', 'forward', 51, 41, 26, 8.1, 79.4, 45, 41, 69, 17, 0],
  ['Flecha7', 'forward', 44, 33, 19, 7.9, 78.2, 42, 39, 63, 13, 1],
  ['Artilheiro', 'forward', 59, 77, 21, 8.3, 76.8, 39, 48, 68, 24, 2],
];

function demoMembers() {
  return PLAYERS.map(
    ([name, pos, gp, goals, assists, rating, passe, desarme, finaliz, vit, mom, cv]) => ({
      name,
      pos,
      proOverall: 78 + ((goals + assists) % 12),
      proHeight: 175 + (gp % 18),
      proStyle: null,
      season: {
        gamesPlayed: gp,
        goals,
        assists,
        mom,
        rating,
        winRate: vit,
        passesMade: Math.round(gp * 24 * (passe / 100)),
        passSuccessRate: passe,
        tacklesMade: Math.round(gp * 2.4),
        tackleSuccessRate: desarme,
        shotSuccessRate: finaliz,
        cleanSheetsDef: pos === 'defender' ? 14 : 0,
        cleanSheetsGK: pos === 'goalkeeper' ? 19 : 0,
        redCards: cv,
      },
      // A carreira acumula bem mais jogos que a temporada, como na API de verdade.
      career: {
        gamesPlayed: gp * 4 + 12,
        goals: goals * 4 + 3,
        assists: assists * 4 + 2,
        mom: mom * 4,
        rating: Math.round((rating - 0.2) * 100) / 100,
      },
    }),
  );
}

const SCORES = [
  [4, 1, '1002'],
  [2, 2, '1003'],
  [3, 0, '1004'],
  [1, 3, '1002'],
  [5, 2, '1003'],
  [2, 1, '1004'],
  [0, 0, '1002'],
  [6, 1, '1003'],
  [1, 2, '1004'],
  [3, 3, '1002'],
];

function demoMatches() {
  const now = Math.floor(Date.now() / 1000);
  return SCORES.map(([gf, ga, oppId], i) => ({
    matchId: `demo-${i}`,
    timestamp: now - (i + 1) * 7200 - i * 43200,
    matchType: i % 5 === 4 ? 'Playoff' : 'Liga',
    goalsFor: gf,
    goalsAgainst: ga,
    result: gf > ga ? 'V' : gf < ga ? 'D' : 'E',
    opponent: {
      clubId: oppId,
      name: CLUBS[oppId]?.name || 'Adversário',
      customKit: KIT,
    },
    stadium: KIT.stadName,
    players: PLAYERS.slice(0, 8)
      .map(([name, pos], idx) => ({
        id: `${i}-${idx}`,
        name,
        pos,
        goals: idx < gf ? 1 : 0,
        assists: idx % 3 === 0 ? 1 : 0,
        shots: (idx * 2 + gf) % 6,
        passesMade: 18 + ((idx * 7 + i) % 30),
        passAttempts: 24 + ((idx * 7 + i) % 34),
        tacklesMade: (idx + i) % 7,
        tackleAttempts: ((idx + i) % 7) + 2,
        saves: pos === 'goalkeeper' ? ga + 2 : 0,
        goalsConceded: pos === 'goalkeeper' ? ga : 0,
        rating: 6.2 + (((idx * 13 + i * 7) % 34) / 10),
        mom: idx === i % 5,
        redCards: 0,
        minutes: 90,
      }))
      .sort((a, b) => b.rating - a.rating),
  }));
}

const OVERALL = {
  gamesPlayed: 214,
  gamesPlayedPlayoff: 18,
  wins: 138,
  losses: 51,
  ties: 25,
  goals: 612,
  goalsAgainst: 331,
  skillRating: 1874,
  bestDivision: 2,
  promotions: 11,
  relegations: 3,
  wstreak: 6,
  unbeatenstreak: 9,
  leagueAppearances: 196,
};

export const demo = {
  search(platform, name) {
    const q = (name || '').toLowerCase();
    return Object.values(CLUBS)
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({
        ...c,
        platform,
        wins: OVERALL.wins,
        losses: OVERALL.losses,
        ties: OVERALL.ties,
        gamesPlayed: OVERALL.gamesPlayed,
        points: OVERALL.wins * 3 + OVERALL.ties,
        currentDivision: 3,
        bestDivision: 2,
      }));
  },
  club(platform, clubId) {
    const base = CLUBS[clubId] || CLUBS[1001];
    return { ...base, platform, stadium: KIT.stadName };
  },
  overall() {
    return { ...OVERALL };
  },
  members: demoMembers,
  matches: demoMatches,
};
