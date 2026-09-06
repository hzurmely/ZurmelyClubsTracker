/**
 * Análise de uma partida.
 *
 * A EA não publica estatística de time por partida: publica linha por linha de
 * cada jogador. Então todos os números de time aqui são somados dos jogadores,
 * e o que ela não devolve (posse de bola, por exemplo) não é inventado. O mais
 * perto disso é a fatia de passes tentados, que aparece com esse nome e não
 * como posse.
 */

import { posGroup } from '@/lib/format';

/** Soma o time inteiro a partir das linhas dos jogadores. */
export function totaisDoTime(jogadores, gols) {
  const lista = jogadores || [];
  const soma = (campo) => lista.reduce((t, p) => t + (p[campo] || 0), 0);
  const comNota = lista.filter((p) => p.rating > 0);

  const passesTentados = soma('passAttempts');
  const desarmesTentados = soma('tackleAttempts');

  return {
    gols,
    jogadores: lista.length,
    finalizacoes: soma('shots'),
    assistencias: soma('assists'),
    passesCertos: soma('passesMade'),
    passesTentados,
    acertoPasse: passesTentados ? (soma('passesMade') / passesTentados) * 100 : null,
    desarmesCertos: soma('tacklesMade'),
    desarmesTentados,
    acertoDesarme: desarmesTentados ? (soma('tacklesMade') / desarmesTentados) * 100 : null,
    defesas: soma('saves'),
    vermelhos: soma('redCards'),
    nota: comNota.length ? comNota.reduce((t, p) => t + p.rating, 0) / comNota.length : 0,
    aproveitamentoChute: soma('shots') ? (gols / soma('shots')) * 100 : null,
  };
}

/** O melhor em campo: a marcação da EA vale mais que a nota, quando existe. */
function melhorEmCampo(jogadores) {
  const lista = (jogadores || []).filter((p) => p.rating > 0);
  if (!lista.length) return null;
  return lista.find((p) => p.mom) || lista.reduce((a, b) => (b.rating > a.rating ? b : a));
}

/**
 * As linhas do comparativo.
 *
 * Cada tipo tem uma régua diferente, senão a barra mente. Contagem divide o
 * espaço entre os dois lados; percentual preenche a metade de cada um com o
 * próprio valor; nota usa a faixa de 5 a 10, que é onde nota de Pro Clubs vive.
 */
export function montarComparativo(meu, dele) {
  const linhas = [
    { chave: 'gols', rotulo: 'Gols', tipo: 'contagem', meu: meu.gols, dele: dele.gols },
    { chave: 'finalizacoes', rotulo: 'Finalizações', tipo: 'contagem', meu: meu.finalizacoes, dele: dele.finalizacoes },
    { chave: 'passes', rotulo: 'Passes tentados', tipo: 'contagem', meu: meu.passesTentados, dele: dele.passesTentados },
    { chave: 'acertoPasse', rotulo: 'Acerto de passe', tipo: 'pct', meu: meu.acertoPasse, dele: dele.acertoPasse },
    { chave: 'desarmes', rotulo: 'Desarmes certos', tipo: 'contagem', meu: meu.desarmesCertos, dele: dele.desarmesCertos },
    { chave: 'acertoDesarme', rotulo: 'Acerto de desarme', tipo: 'pct', meu: meu.acertoDesarme, dele: dele.acertoDesarme },
    { chave: 'defesas', rotulo: 'Defesas do goleiro', tipo: 'contagem', meu: meu.defesas, dele: dele.defesas },
    { chave: 'nota', rotulo: 'Nota média', tipo: 'nota', meu: meu.nota, dele: dele.nota },
  ];

  return linhas
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
        const faixa = (v) => Math.max(0, Math.min(100, ((v - 5) / 5) * 100));
        escalaMeu = faixa(a);
        escalaDele = faixa(b);
      }

      const escrever = (v) => {
        if (!Number.isFinite(v)) return 'n/d';
        if (l.tipo === 'pct') return `${Math.round(v)}%`;
        if (l.tipo === 'nota') return v.toFixed(2).replace('.', ',');
        return String(v);
      };

      return {
        ...l,
        escalaMeu,
        escalaDele,
        textoMeu: escrever(l.meu),
        textoDele: escrever(l.dele),
        vencedor: a === b ? null : a > b ? 'meu' : 'dele',
      };
    });
}

/* ------------------------------------------------------------------ */
/* Leitura do jogo                                                     */
/* ------------------------------------------------------------------ */

function nomeCurto(nome) {
  return (nome || '').length > 24 ? `${nome.slice(0, 22)}…` : nome;
}

/**
 * Três ou quatro frases sobre o que aconteceu, cada uma amarrada a um número
 * que está na página. Nada de frase genérica: se o dado não sustenta a leitura,
 * a frase não entra.
 */
export function leituraDaPartida({ partida, meu, dele, mvpMeu, nomeMeu, nomeDele }) {
  const frases = [];
  // Sem as linhas do adversário não dá para comparar nada: nesse caso as frases
  // se limitam ao que é do próprio time.
  const temAdversario = dele.jogadores > 0;
  const margem = Math.abs(partida.goalsFor - partida.goalsAgainst);
  const placar = `${partida.goalsFor} a ${partida.goalsAgainst}`;

  if (partida.result === 'V') {
    frases.push(
      margem >= 3
        ? `Vitória folgada por ${placar}.`
        : margem === 1
          ? `Vitória apertada por ${placar}.`
          : `Vitória por ${placar}.`,
    );
  } else if (partida.result === 'D') {
    frases.push(
      margem >= 3
        ? `Derrota pesada por ${placar}.`
        : margem === 1
          ? `Derrota por um gol, ${placar}.`
          : `Derrota por ${placar}.`,
    );
  } else {
    frases.push(`Empate em ${placar}.`);
  }

  // Eficiência de finalização, que é o que separa criar de resolver. A
  // comparação de volume só entra com folga de verdade: dois chutes de
  // diferença não são história nenhuma.
  if (meu.finalizacoes > 0) {
    const ap = Math.round(meu.aproveitamentoChute);
    const folga = Math.abs(meu.finalizacoes - dele.finalizacoes) >= 4 && temAdversario;
    if (partida.result === 'V' && folga && meu.finalizacoes < dele.finalizacoes) {
      frases.push(
        `Ganhou finalizando menos: ${meu.finalizacoes} chutes contra ${dele.finalizacoes} do adversário, e converteu ${ap}% dos seus.`,
      );
    } else if (partida.result === 'D' && folga && meu.finalizacoes > dele.finalizacoes) {
      frases.push(
        `Chutou mais e não resolveu: ${meu.finalizacoes} finalizações para ${partida.goalsFor} ${partida.goalsFor === 1 ? 'gol' : 'gols'}, ${ap}% de aproveitamento.`,
      );
    } else if (ap >= 40) {
      frases.push(`Matou quase tudo que criou: ${ap}% das ${meu.finalizacoes} finalizações viraram gol.`);
    } else if (ap <= 15 && meu.finalizacoes >= 8) {
      frases.push(`Desperdiçou muito: ${meu.finalizacoes} finalizações para ${ap}% de aproveitamento.`);
    }
  }

  // Quem ficou com a bola, medido pela fatia de passes tentados.
  const totalPasses = meu.passesTentados + dele.passesTentados;
  if (temAdversario && totalPasses >= 100) {
    const fatia = Math.round((meu.passesTentados / totalPasses) * 100);
    if (fatia >= 62) {
      frases.push(
        `Ficou com a bola: ${fatia}% dos passes tentados na partida saíram do ${nomeCurto(nomeMeu)}.`,
      );
    } else if (fatia <= 38) {
      frases.push(
        `Jogou sem a bola: só ${fatia}% dos passes tentados foram seus, o ${nomeCurto(nomeDele)} ficou com o resto.`,
      );
    }
  }

  // Goleiro e defesa.
  if (meu.defesas >= 5) {
    frases.push(`O goleiro segurou o que dava, com ${meu.defesas} defesas.`);
  } else if (temAdversario && partida.goalsAgainst >= 4 && dele.finalizacoes > 0) {
    frases.push(
      `A defesa não segurou: ${partida.goalsAgainst} gols sofridos em ${dele.finalizacoes} finalizações do adversário.`,
    );
  }

  if (mvpMeu) {
    const feitos = [];
    if (mvpMeu.goals) feitos.push(`${mvpMeu.goals} ${mvpMeu.goals === 1 ? 'gol' : 'gols'}`);
    if (mvpMeu.assists) feitos.push(`${mvpMeu.assists} ${mvpMeu.assists === 1 ? 'assistência' : 'assistências'}`);
    const nota = mvpMeu.rating.toFixed(2).replace('.', ',');
    frases.push(
      feitos.length
        ? `${mvpMeu.name} foi o melhor do time: nota ${nota} com ${feitos.join(' e ')}.`
        : `${mvpMeu.name} foi o melhor do time, com nota ${nota}.`,
    );
  }

  return frases.slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* Retrospecto                                                         */
/* ------------------------------------------------------------------ */

/** Como o clube se sai contra esse adversário dentro do que a EA ainda guarda. */
export function retrospecto(todas, adversarioId, matchIdAtual) {
  if (!adversarioId) return null;
  const jogos = (todas || [])
    .filter((m) => m.opponent?.clubId === adversarioId)
    .sort((a, b) => b.timestamp - a.timestamp);
  if (jogos.length < 2) return null;

  return {
    jogos: jogos.length,
    v: jogos.filter((m) => m.result === 'V').length,
    e: jogos.filter((m) => m.result === 'E').length,
    d: jogos.filter((m) => m.result === 'D').length,
    golsPro: jogos.reduce((t, m) => t + m.goalsFor, 0),
    golsContra: jogos.reduce((t, m) => t + m.goalsAgainst, 0),
    lista: jogos.map((m) => ({ ...m, atual: m.matchId === matchIdAtual })),
  };
}

/* ------------------------------------------------------------------ */

/** Junta tudo que a página da partida mostra. */
export function analisarPartida({ partida, todas, clube }) {
  if (!partida) return null;

  const nomeMeu = partida.clube?.name || clube?.name || 'Meu clube';
  const nomeDele = partida.opponent?.name || 'Adversário';

  const meu = totaisDoTime(partida.players, partida.goalsFor);
  const dele = totaisDoTime(partida.opponentPlayers, partida.goalsAgainst);

  const mvpMeu = melhorEmCampo(partida.players);
  const mvpDele = melhorEmCampo(partida.opponentPlayers);

  return {
    partida,
    times: {
      meu: {
        nome: nomeMeu,
        clubId: partida.clube?.clubId || clube?.clubId || null,
        customKit: partida.clube?.customKit || clube?.customKit || null,
        gols: partida.goalsFor,
        jogadores: partida.players || [],
        totais: meu,
        mvp: mvpMeu,
      },
      dele: {
        nome: nomeDele,
        clubId: partida.opponent?.clubId || null,
        customKit: partida.opponent?.customKit || null,
        gols: partida.goalsAgainst,
        jogadores: partida.opponentPlayers || [],
        totais: dele,
        mvp: mvpDele,
      },
    },
    comparativo: montarComparativo(meu, dele),
    leitura: leituraDaPartida({ partida, meu, dele, mvpMeu, nomeMeu, nomeDele }),
    retrospecto: retrospecto(todas, partida.opponent?.clubId, partida.matchId),
    temAdversario: (partida.opponentPlayers || []).length > 0,
  };
}

/** Só para a tabela: agrupa por setor, com o goleiro primeiro. */
export function ordenarElenco(jogadores) {
  const peso = { gk: 0, def: 1, mid: 2, att: 3 };
  return [...(jogadores || [])].sort(
    (a, b) => (peso[posGroup(a.pos)] ?? 9) - (peso[posGroup(b.pos)] ?? 9) || b.rating - a.rating,
  );
}
