/**
 * DNA do atleta.
 *
 * Pega um jogador do elenco e responde tres perguntas que a tabela crua nao
 * responde: em que ele e bom comparado aos companheiros, o que ele ja conquistou
 * dentro do clube, e como a nota dele se comportou nas ultimas partidas.
 *
 * Nada aqui inventa numero. Tudo sai de /members/stats, /members/career/stats e
 * do bloco de jogadores de cada partida, que sao os tres unicos lugares onde a
 * EA publica desempenho individual.
 */

import { posGroup } from '@/lib/format';

/**
 * Os seis eixos do radar.
 *
 * Sao os mesmos para todo mundo, inclusive goleiro, de proposito. O radar existe
 * para comparar jogadores do mesmo elenco, e trocar os eixos por posicao tornaria
 * as figuras incomparaveis. O goleiro aparece com o formato dele, curto na frente
 * e alto no passe, que ja e a leitura certa.
 */
export const EIXOS = [
  { chave: 'gols', rotulo: 'Gols', tipo: 'porJogo', campo: 'goals' },
  { chave: 'finalizacao', rotulo: 'Finalização', tipo: 'pct', campo: 'shotSuccessRate' },
  { chave: 'assistencias', rotulo: 'Assistências', tipo: 'porJogo', campo: 'assists' },
  { chave: 'passe', rotulo: 'Passe', tipo: 'pct', campo: 'passSuccessRate' },
  { chave: 'desarme', rotulo: 'Desarme', tipo: 'pct', campo: 'tackleSuccessRate' },
  { chave: 'nota', rotulo: 'Regularidade', tipo: 'nota', campo: 'rating' },
];

/** Valor bruto de um eixo para um jogador, ja normalizado por jogo quando for o caso. */
function valorDoEixo(eixo, s) {
  if (!s) return 0;
  const bruto = s[eixo.campo];
  if (!Number.isFinite(bruto)) return 0;
  if (eixo.tipo === 'porJogo') return s.gamesPlayed ? bruto / s.gamesPlayed : 0;
  return bruto;
}

/** Como o numero aparece escrito ao lado do radar. */
function textoDoEixo(eixo, valor) {
  if (eixo.tipo === 'pct') return `${Math.round(valor)}%`;
  if (eixo.tipo === 'nota') return valor.toFixed(2).replace('.', ',');
  return `${valor.toFixed(2).replace('.', ',')} por jogo`;
}

/**
 * Escala de 0 a 100. O topo do radar e o melhor do elenco naquele item, entao a
 * figura responde "onde ele esta em relacao aos companheiros", que e a pergunta
 * util. A nota tem tratamento proprio: 5,0 e o chao, porque nota de Pro Clubs
 * quase nunca desce disso e sem o corte todas as figuras ficariam iguais.
 */
function escalar(eixo, valor, teto) {
  if (eixo.tipo === 'nota') {
    const piso = 5;
    const alvo = Math.max(teto, piso + 0.5);
    if (valor <= piso) return 0;
    return Math.max(0, Math.min(100, ((valor - piso) / (alvo - piso)) * 100));
  }
  if (!teto) return 0;
  return Math.max(0, Math.min(100, (valor / teto) * 100));
}

/** Bloco de estatistica do recorte pedido, com reserva para o outro. */
function bloco(m, modo) {
  if (modo === 'career') return m.career || m.season || null;
  return m.season || m.career || null;
}

/* ------------------------------------------------------------------ */
/* Medalhas                                                            */
/* ------------------------------------------------------------------ */

/** Melhor do elenco num campo, respeitando um minimo de amostra. */
function lider(lista, campo, minimoJogos = 0) {
  const candidatos = lista
    .filter((x) => x.s && (x.s.gamesPlayed || 0) >= minimoJogos && (x.s[campo] || 0) > 0)
    .sort((a, b) => (b.s[campo] || 0) - (a.s[campo] || 0));
  return candidatos[0] || null;
}

/** Maior sequencia de partidas seguidas com gol ou assistencia. */
function maiorSequencia(partidas) {
  let atual = 0;
  let melhor = 0;
  for (const p of partidas) {
    if ((p.goals || 0) + (p.assists || 0) > 0) {
      atual += 1;
      if (atual > melhor) melhor = atual;
    } else {
      atual = 0;
    }
  }
  return melhor;
}

function marcos(valor, degraus, monta) {
  const alcancado = [...degraus].reverse().find((d) => valor >= d);
  return alcancado ? monta(alcancado) : null;
}

/**
 * As medalhas sao de dois tipos. As de elenco dependem de quem esta no clube
 * hoje e podem trocar de dono; as de marco sao do jogador e nao saem mais.
 */
function montarMedalhas({ jogador, s, elenco, partidas, modo }) {
  const medalhas = [];
  const eu = jogador.name;
  const comStats = elenco.map((m) => ({ m, s: bloco(m, modo) })).filter((x) => x.s);

  const disputas = [
    { campo: 'goals', min: 0, icone: '🥅', titulo: 'Artilheiro do elenco', unidade: 'gols' },
    { campo: 'assists', min: 0, icone: '🎯', titulo: 'Garçom do elenco', unidade: 'assistências' },
    { campo: 'mom', min: 0, icone: '⭐', titulo: 'Craque da casa', unidade: 'vezes melhor em campo' },
    { campo: 'rating', min: 5, icone: '📈', titulo: 'Melhor nota do elenco', unidade: 'de média' },
    { campo: 'gamesPlayed', min: 0, icone: '🧱', titulo: 'Quem mais joga', unidade: 'partidas' },
    { campo: 'passSuccessRate', min: 5, icone: '🎼', titulo: 'Melhor passe', unidade: 'de acerto', pct: true },
    { campo: 'tackleSuccessRate', min: 5, icone: '🛡️', titulo: 'Melhor desarme', unidade: 'de acerto', pct: true },
    { campo: 'shotSuccessRate', min: 5, icone: '🎱', titulo: 'Melhor finalização', unidade: 'de acerto', pct: true },
  ];

  for (const d of disputas) {
    const dono = lider(comStats, d.campo, d.min);
    if (!dono || dono.m.name !== eu) continue;
    const v = dono.s[d.campo];
    const escrito = d.pct
      ? `${Math.round(v)}%`
      : d.campo === 'rating'
        ? v.toFixed(2).replace('.', ',')
        : String(v);
    medalhas.push({
      tipo: 'elenco',
      icone: d.icone,
      titulo: d.titulo,
      detalhe: `${escrito} ${d.unidade}`,
    });
  }

  if (s) {
    const m1 = marcos(s.gamesPlayed || 0, [25, 50, 100, 200, 400], (n) => ({
      tipo: 'marco',
      icone: '🏟️',
      titulo: `${n} partidas`,
      detalhe: `${s.gamesPlayed} no total`,
    }));
    if (m1) medalhas.push(m1);

    const m2 = marcos(s.goals || 0, [10, 25, 50, 100, 200], (n) => ({
      tipo: 'marco',
      icone: '⚽',
      titulo: `${n} gols`,
      detalhe: `${s.goals} no total`,
    }));
    if (m2) medalhas.push(m2);

    const m3 = marcos(s.assists || 0, [10, 25, 50, 100], (n) => ({
      tipo: 'marco',
      icone: '🅰️',
      titulo: `${n} assistências`,
      detalhe: `${s.assists} no total`,
    }));
    if (m3) medalhas.push(m3);

    if ((s.gamesPlayed || 0) >= 10 && (s.rating || 0) >= 8) {
      medalhas.push({
        tipo: 'marco',
        icone: '💎',
        titulo: 'Nota 8 ou mais',
        detalhe: `${s.rating.toFixed(2).replace('.', ',')} em ${s.gamesPlayed} partidas`,
      });
    }
    if ((s.cleanSheetsGK || 0) >= 5) {
      medalhas.push({
        tipo: 'marco',
        icone: '🧤',
        titulo: 'Gol fechado',
        detalhe: `${s.cleanSheetsGK} jogos sem sofrer`,
      });
    }
  }

  if (partidas.length) {
    const seq = maiorSequencia(partidas);
    if (seq >= 3) {
      medalhas.push({
        tipo: 'recente',
        icone: '🔥',
        titulo: 'Sequência quente',
        detalhe: `${seq} partidas seguidas participando de gol`,
      });
    }
    const melhorNota = partidas.reduce((a, b) => (b.rating > a.rating ? b : a), partidas[0]);
    if (melhorNota.rating >= 9) {
      medalhas.push({
        tipo: 'recente',
        icone: '🎬',
        titulo: 'Atuação de gala',
        detalhe: `nota ${melhorNota.rating.toFixed(2).replace('.', ',')} contra ${melhorNota.adversario}`,
      });
    }
    const poker = partidas.find((p) => (p.goals || 0) >= 3);
    if (poker) {
      medalhas.push({
        tipo: 'recente',
        icone: '🎩',
        titulo: poker.goals >= 4 ? 'Quatro em uma noite' : 'Hat-trick',
        detalhe: `${poker.goals} gols contra ${poker.adversario}`,
      });
    }
  }

  const peso = { elenco: 0, recente: 1, marco: 2 };
  return medalhas.sort((a, b) => peso[a.tipo] - peso[b.tipo]);
}

/* ------------------------------------------------------------------ */
/* Arquetipo                                                           */
/* ------------------------------------------------------------------ */

const RECEITAS = [
  { par: ['gols', 'finalizacao'], titulo: 'Finalizador', texto: 'Converte o que aparece. O volume de gol dele vem da eficiência, não de chutar muito.' },
  { par: ['gols', 'assistencias'], titulo: 'Decisivo', texto: 'Participa do gol pelos dois lados, marcando e servindo, e é o nome que muda placar.' },
  { par: ['assistencias', 'passe'], titulo: 'Criador', texto: 'O time passa por ele. Constrói a jogada e entrega a bola no pé de quem finaliza.' },
  { par: ['assistencias', 'finalizacao'], titulo: 'Segundo atacante', texto: 'Joga entre linhas: chega para finalizar mas também é a última ligação antes do gol.' },
  { par: ['passe', 'desarme'], titulo: 'Meio de ligação', texto: 'Rouba e recomeça. Segura a bola do time e faz o trabalho sujo no meio.' },
  { par: ['desarme', 'nota'], titulo: 'Marcador', texto: 'Sustenta a defesa. A nota alta dele vem de desarme e posicionamento, não de estatística ofensiva.' },
  { par: ['gols', 'passe'], titulo: 'Camisa 10', texto: 'Chega ao gol saindo de trás, com a bola nos pés durante boa parte do jogo.' },
  { par: ['gols', 'nota'], titulo: 'Referência de área', texto: 'Vive de gol e mantém a média alta mesmo nos jogos em que participa pouco da construção.' },
  { par: ['passe', 'nota'], titulo: 'Metrônomo', texto: 'Erra pouco e joga simples. É o jogador que dá ritmo sem aparecer na súmula.' },
  { par: ['desarme', 'finalizacao'], titulo: 'Box to box', texto: 'Cobre os dois lados do campo: aparece no desarme e também chega na área.' },
  { par: ['assistencias', 'desarme'], titulo: 'Ala', texto: 'Sobe e desce pelo corredor. Ajuda na marcação e entrega bola na área.' },
  { par: ['assistencias', 'nota'], titulo: 'Articulador', texto: 'Constrói e mantém regularidade. Rende sem depender de fazer gol.' },
  { par: ['finalizacao', 'nota'], titulo: 'Oportunista', texto: 'Aproveita pouco e converte bem. Rende alto com pouca participação no volume.' },
  { par: ['finalizacao', 'passe'], titulo: 'Atacante de jogo', texto: 'Finaliza com critério e participa da troca de passes em vez de só esperar a bola.' },
  { par: ['gols', 'desarme'], titulo: 'Guerreiro', texto: 'Briga em campo inteiro. Marca e ainda aparece no ataque.' },
  { par: ['desarme', 'passe'], titulo: 'Primeiro homem', texto: 'Recupera e distribui. O time reinicia por ele.' },
];

/**
 * Tetos de referencia, usados so quando o elenco e pequeno demais para servir de
 * comparacao. Com dois jogadores no clube, todo mundo e o melhor em alguma
 * coisa, e a escala relativa deixaria qualquer um parecer completo.
 */
const REFERENCIA = {
  gols: 0.8,
  finalizacao: 50,
  assistencias: 0.6,
  passe: 88,
  desarme: 65,
  nota: 8.5,
};

function arquetipo(eixos, grupo, elenco = 0) {
  const comparavel = elenco >= 3;
  const forca = (e) =>
    comparavel ? e.escala : Math.min(100, (e.valor / (REFERENCIA[e.chave] || 1)) * 100);
  const ordenados = [...eixos].sort((a, b) => forca(b) - forca(a));
  const top = ordenados.slice(0, 2).map((e) => e.chave);
  const media = eixos.reduce((soma, e) => soma + forca(e), 0) / (eixos.length || 1);
  const desvio = Math.sqrt(
    eixos.reduce((soma, e) => soma + (forca(e) - media) ** 2, 0) / (eixos.length || 1),
  );

  if (grupo === 'gk') {
    return {
      titulo: 'Goleiro',
      texto:
        'O radar do goleiro fica curto na frente por natureza. O que vale ler nele é o passe, o desarme e a regularidade.',
    };
  }

  if (comparavel && desvio < 14 && media > 45) {
    return {
      titulo: 'Completo',
      texto: 'Não tem um pico isolado: rende parecido em tudo, o que sustenta o time em qualquer papel.',
    };
  }

  const achado = RECEITAS.find(
    (r) => r.par.includes(top[0]) && r.par.includes(top[1]),
  );
  if (achado) return { titulo: achado.titulo, texto: achado.texto };

  const primeiro = ordenados[0];
  return {
    titulo: `Forte em ${primeiro.rotulo.toLowerCase()}`,
    texto: `O que mais separa ele do resto do elenco é ${primeiro.rotulo.toLowerCase()}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Partidas do jogador                                                 */
/* ------------------------------------------------------------------ */

/** Recorta o histórico do clube pelo nome do jogador, da mais antiga para a mais nova. */
export function partidasDoJogador(matches, nome) {
  const lista = [];
  for (const m of matches || []) {
    const eu = (m.players || []).find((p) => p.name === nome);
    if (!eu) continue;
    lista.push({
      matchId: m.matchId,
      timestamp: m.timestamp,
      tipo: m.matchType,
      adversario: m.opponent?.name || 'Adversário',
      adversarioId: m.opponent?.clubId || null,
      placar: `${m.goalsFor} x ${m.goalsAgainst}`,
      resultado: m.result,
      rating: eu.rating || 0,
      goals: eu.goals || 0,
      assists: eu.assists || 0,
      shots: eu.shots || 0,
      passe: eu.passAttempts ? (eu.passesMade / eu.passAttempts) * 100 : null,
      desarme: eu.tackleAttempts ? (eu.tacklesMade / eu.tackleAttempts) * 100 : null,
      saves: eu.saves || 0,
      sofridos: eu.goalsConceded || 0,
      mom: eu.mom,
      minutos: eu.minutos || 0,
      pos: eu.pos || '',
    });
  }
  return lista.sort((a, b) => a.timestamp - b.timestamp);
}

/* ------------------------------------------------------------------ */
/* Perfil completo                                                     */
/* ------------------------------------------------------------------ */

/**
 * Junta tudo. Devolve null quando o jogador nao existe no elenco, para a pagina
 * poder mostrar um 404 honesto em vez de um perfil vazio.
 */
export function perfilDoJogador({ members, matches, nome, modo = 'season' }) {
  const elenco = members || [];
  const jogador = elenco.find((m) => m.name === nome);
  if (!jogador) return null;

  const s = bloco(jogador, modo);
  const temTemporada = elenco.some((m) => m.season);
  const temCarreira = elenco.some((m) => m.career);

  // O radar so faz sentido no recorte da temporada: a carreira nao traz
  // percentual nenhum, entao tres dos seis eixos ficariam zerados.
  const comSeason = elenco.map((m) => ({ m, s: m.season })).filter((x) => x.s);
  const minha = jogador.season;

  const eixos = EIXOS.map((eixo) => {
    const valores = comSeason.map((x) => valorDoEixo(eixo, x.s));
    const teto = valores.length ? Math.max(...valores) : 0;
    const meu = valorDoEixo(eixo, minha);
    const mediaElenco = valores.length
      ? valores.reduce((a, b) => a + b, 0) / valores.length
      : 0;
    const ordenados = [...valores].sort((a, b) => b - a);
    return {
      chave: eixo.chave,
      rotulo: eixo.rotulo,
      valor: meu,
      texto: textoDoEixo(eixo, meu),
      escala: escalar(eixo, meu, teto),
      escalaElenco: escalar(eixo, mediaElenco, teto),
      textoElenco: textoDoEixo(eixo, mediaElenco),
      posicao: ordenados.indexOf(meu) + 1,
      de: valores.length,
    };
  });

  const partidas = partidasDoJogador(matches, nome);
  const medalhas = montarMedalhas({ jogador, s, elenco, partidas, modo });
  const grupo = posGroup(jogador.pos);

  const notas = partidas.filter((p) => p.rating > 0);
  const resumo = notas.length
    ? {
        jogos: partidas.length,
        notaMedia: notas.reduce((a, p) => a + p.rating, 0) / notas.length,
        gols: partidas.reduce((a, p) => a + p.goals, 0),
        assistencias: partidas.reduce((a, p) => a + p.assists, 0),
        mom: partidas.filter((p) => p.mom).length,
        melhor: notas.reduce((a, b) => (b.rating > a.rating ? b : a)),
        vitorias: partidas.filter((p) => p.resultado === 'V').length,
      }
    : null;

  return {
    jogador: {
      name: jogador.name,
      pos: jogador.pos,
      grupo,
      proOverall: jogador.proOverall || 0,
      proHeight: jogador.proHeight || 0,
    },
    modo,
    temTemporada,
    temCarreira,
    stats: s,
    season: jogador.season,
    career: jogador.career,
    temRadar: Boolean(minha) && comSeason.length > 0,
    eixos,
    arquetipo: arquetipo(eixos, grupo, comSeason.length),
    medalhas,
    partidas,
    resumo,
    elenco: comSeason.length,
  };
}
