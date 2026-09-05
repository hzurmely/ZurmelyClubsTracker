/**
 * Dados de demonstracao. Usados apenas quando EA_DEMO=1 no .env.local.
 * Servem para desenvolver o layout sem depender da API da EA (que cai com
 * alguma frequencia). O site sempre mostra um aviso quando esta neste modo.
 */

const KIT = {
  kitColor1: '10',
  crestColor: '0',
  crestAssetId: '250099942',
  stadName: 'Arena Zurmely',
  customKitId: '1',
};

const CLUBS = {
  '1001': { clubId: '1001', name: 'FURIA VIRTUAL FC', regionId: 5, customKit: KIT },
  '1002': { clubId: '1002', name: 'REAL BOTECO', regionId: 5, customKit: KIT },
  '1003': { clubId: '1003', name: 'PENTA UNITED', regionId: 5, customKit: KIT },
  '1004': { clubId: '1004', name: 'CANARINHO ESPORTS', regionId: 5, customKit: KIT },
};

const PLAYERS = [
  ['Muralha', 'GK', 61, 0, 1, 6.9, 88.2, 12, 74.0, 8, 0],
  ['Zaga_BR', 'CB', 58, 2, 4, 7.1, 86.4, 141, 81.3, 4, 22],
  ['Pilar99', 'CB', 54, 1, 3, 7.0, 84.9, 133, 79.8, 3, 20],
  ['Lateral_Voador', 'LB', 49, 6, 17, 7.4, 82.1, 96, 71.2, 5, 26],
  ['RB_Turbo', 'RB', 47, 5, 15, 7.3, 81.0, 91, 70.5, 4, 24],
  ['Cerebro', 'CDM', 60, 7, 22, 7.8, 91.3, 118, 76.4, 9, 31],
  ['Maestro10', 'CAM', 62, 34, 51, 8.4, 89.7, 42, 55.1, 21, 44],
  ['Camisa8', 'CM', 55, 19, 29, 7.9, 88.1, 67, 63.9, 12, 38],
  ['Ponta_Rapida', 'LW', 51, 41, 26, 8.1, 79.4, 21, 44.7, 17, 41],
  ['Flecha7', 'RW', 44, 33, 19, 7.9, 78.2, 18, 42.3, 13, 39],
  ['Artilheiro', 'ST', 59, 77, 21, 8.3, 76.8, 15, 38.6, 24, 48],
];

function demoMembers() {
  return PLAYERS.map(
    ([
      name,
      pos,
      gp,
      goals,
      assists,
      rating,
      passRate,
      tackles,
      tackleRate,
      mom,
      shotRate,
    ]) => ({
      name,
      proName: name,
      gamesPlayed: gp,
      goals,
      assists,
      manOfTheMatch: mom,
      ratingAve: rating,
      passesMade: Math.round(gp * 24 * (passRate / 100)),
      passSuccessRate: passRate,
      tacklesMade: tackles,
      tackleSuccessRate: tackleRate,
      shotSuccessRate: shotRate,
      winRate: 55 + ((goals + assists) % 17),
      cleanSheetsDef: pos === 'CB' || pos === 'LB' || pos === 'RB' ? 14 : 0,
      cleanSheetsGK: pos === 'GK' ? 19 : 0,
      redCards: pos === 'CB' ? 2 : goals % 2,
      favoritePosition: pos,
      proPos: pos,
      proOverall: 82 + (goals % 9),
      proHeight: 175 + (gp % 18),
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

function demoMatches(clubId) {
  const now = Math.floor(Date.now() / 1000);
  return SCORES.map(([gf, ga, oppId], i) => ({
    matchId: `demo-${i}`,
    timestamp: now - (i + 1) * 7200 - i * 43200,
    goalsFor: gf,
    goalsAgainst: ga,
    result: gf > ga ? 'V' : gf < ga ? 'D' : 'E',
    opponent: {
      clubId: oppId,
      name: CLUBS[oppId]?.name || 'Adversario',
      customKit: KIT,
    },
    stadium: KIT.stadName,
    players: PLAYERS.slice(0, 8).map(([name, pos], idx) => ({
      id: `${i}-${idx}`,
      name,
      pos: pos.toLowerCase(),
      goals: idx < gf ? 1 : 0,
      assists: idx % 3 === 0 ? 1 : 0,
      shots: (idx * 2 + gf) % 6,
      passesMade: 18 + ((idx * 7 + i) % 30),
      passAttempts: 24 + ((idx * 7 + i) % 34),
      tacklesMade: (idx + i) % 7,
      saves: pos === 'GK' ? ga + 2 : 0,
      rating: 6.2 + (((idx * 13 + i * 7) % 34) / 10),
      mom: idx === (i % 5),
      redCards: 0,
    })).sort((a, b) => b.rating - a.rating),
  }));
}

const OVERALL = {
  gamesPlayed: 214,
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
  lastMatch: [],
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
      }));
  },
  club(platform, clubId) {
    const base = CLUBS[clubId] || CLUBS['1001'];
    return { ...base, platform };
  },
  overall() {
    return { ...OVERALL };
  },
  members: demoMembers,
  matches: demoMatches,
};
