'use client';

import { useState } from 'react';
import Link from 'next/link';
import RadarDNA from '@/components/RadarDNA';
import GraficoNotas from '@/components/GraficoNotas';
import { useDic } from '@/components/I18nProvider';
import { posLabel, initials, dec, nf, pct } from '@/lib/format';

function notaClasse(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

/** Green for a high rating, red for a low one, neutral in between. */
function corDaNota(v) {
  const c = notaClasse(v);
  if (c === 'a') return 'good';
  if (c === 'c') return 'bad';
  return '';
}

function quando(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function DnaAtleta({ perfil, platform, clubId, clubName }) {
  const dic = useDic();
  const [modo, setModo] = useState(perfil.temTemporada ? 'season' : 'career');
  const recorte = perfil.recortes[modo] || perfil.recortes.season || perfil.recortes.career;
  const s = recorte?.stats;
  const j = perfil.jogador;
  const ultimas = [...perfil.partidas].reverse().slice(0, 12);
  // With the desktop archive the history can run into the hundreds, and three
  // hundred points on a line a thousand pixels wide is a smear. The chart shows
  // the most recent stretch; the totals below still count everything.
  const JANELA = 30;
  const serie = perfil.partidas.slice(-JANELA);

  const T = dic.dna.tiles;
  const tiles = [
    { k: T.games, v: nf(s?.gamesPlayed || 0, dic) },
    {
      k: T.goals,
      v: nf(s?.goals || 0, dic),
      sub: s?.gamesPlayed ? T.perGame(dec((s.goals || 0) / s.gamesPlayed, 2, dic)) : null,
    },
    {
      k: T.assists,
      v: nf(s?.assists || 0, dic),
      sub: s?.gamesPlayed ? T.perGame(dec((s.assists || 0) / s.gamesPlayed, 2, dic)) : null,
    },
    { k: T.rating, v: dec(s?.rating || 0, 2, dic), nota: s?.rating || 0 },
    {
      k: T.mom,
      v: nf(s?.mom || 0, dic),
      sub: s?.gamesPlayed ? T.ofGames(pct(((s.mom || 0) / s.gamesPlayed) * 100)) : null,
    },
  ];

  if (modo === 'season' && s) {
    tiles.push(
      { k: T.wins, v: pct(s.winRate || 0) },
      { k: T.pass, v: pct(s.passSuccessRate || 0), sub: T.passesMade(nf(s.passesMade || 0, dic)) },
      { k: T.tackle, v: pct(s.tackleSuccessRate || 0), sub: T.tacklesMade(nf(s.tacklesMade || 0, dic)) },
      { k: T.shot, v: pct(s.shotSuccessRate || 0) },
    );
    if (j.grupo === 'gk' || (s.cleanSheetsGK || 0) > 0) {
      tiles.push({ k: T.cleanSheets, v: nf(s.cleanSheetsGK || 0, dic), sub: T.cleanSheetsSub });
    }
  }

  return (
    <div className="stack" style={{ gap: 26 }}>
      <div className="atleta-topo">
        <div className={`atleta-ini ${j.grupo}`}>{initials(j.name)}</div>
        <div className="grow">
          <div className="row row-wrap" style={{ gap: 8 }}>
            <span className={`poschip ${j.grupo}`}>{posLabel(j.pos)}</span>
            {j.proOverall ? <span className="ovr">{j.proOverall}</span> : null}
            <span className="tag">{perfil.arquetipo.titulo}</span>
          </div>
          <h1 className="atleta-nome">{j.name}</h1>
          <p className="atleta-clube">
            <Link href={`/clube/${platform}/${clubId}`}>{clubName}</Link>
          </p>
        </div>

        {perfil.temTemporada && perfil.temCarreira && (
          <div className="tabs">
            <button className={`tab ${modo === 'season' ? 'on' : ''}`} onClick={() => setModo('season')}>
              {dic.squad.season}
            </button>
            <button className={`tab ${modo === 'career' ? 'on' : ''}`} onClick={() => setModo('career')}>
              {dic.squad.career}
            </button>
          </div>
        )}
      </div>

      <div className="panel pad atleta-dna">
        <div className="dna-selo">{dic.dna.badge}</div>
        <div>
          <div className="dna-titulo">{perfil.arquetipo.titulo}</div>
          <p className="dna-texto">{perfil.arquetipo.texto}</p>
        </div>
      </div>

      <div className="grid-stats">
        {tiles.map((t) => (
          <div className="stat" key={t.k}>
            <div className="k">{t.k}</div>
            <div className={`v ${t.nota ? corDaNota(t.nota) : ''}`}>{t.v}</div>
            {t.sub ? <div className="sub">{t.sub}</div> : null}
          </div>
        ))}
      </div>

      {modo === 'career' && (
        <p style={{ color: 'var(--dim)', fontSize: 13 }}>{dic.dna.careerNote}</p>
      )}

      {recorte?.medalhas?.length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">{dic.dna.medalsTitle}</div>
          <div className="medalhas">
            {recorte.medalhas.map((m) => (
              <div className={`medalha ${m.tipo}`} key={m.titulo}>
                <span className="med-ico">{m.icone}</span>
                <span>
                  <b>{m.titulo}</b>
                  <i>{m.detalhe}</i>
                </span>
              </div>
            ))}
          </div>
          <p className="nota-rodape">{dic.dna.medalsNote}</p>
        </div>
      )}

      {perfil.temRadar && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">{dic.dna.strongTitle}</div>
          <div className="panel pad">
            <RadarDNA eixos={perfil.eixos} nome={j.name} dic={dic} />
          </div>
          <p className="nota-rodape">
            {dic.dna.radarNote(perfil.elenco)}
            {perfil.elenco < 3 && dic.dna.radarWeak}
          </p>
        </div>
      )}

      <div className="stack" style={{ gap: 12 }}>
        <div className="panel-title">{dic.dna.ratingTitle}</div>
        <div className="panel pad">
          <GraficoNotas partidas={serie} media={perfil.resumo?.notaMedia} dic={dic} />
        </div>
        {perfil.resumo && (
          <p className="nota-rodape">
            {dic.dna.ratingNote(
              perfil.resumo.jogos,
              perfil.resumo.gols,
              perfil.resumo.assistencias,
              dec(perfil.resumo.notaMedia, 2, dic),
              perfil.resumo.mom,
            )}
            {perfil.partidas.length > JANELA && dic.dna.ratingWindow(JANELA)}
          </p>
        )}
      </div>

      {ultimas.length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">{dic.dna.lastTitle}</div>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>{dic.dna.lastCols.match}</th>
                  <th>{dic.dna.lastCols.rating}</th>
                  <th title={dic.squad.cols.goalsHint}>{dic.dna.lastCols.goals}</th>
                  <th title={dic.squad.cols.assistsHint}>{dic.dna.lastCols.assists}</th>
                  <th>{dic.dna.lastCols.shots}</th>
                  <th title={dic.squad.cols.passHint}>{dic.dna.lastCols.pass}</th>
                  <th title={dic.squad.cols.tackleHint}>{dic.dna.lastCols.tackle}</th>
                  <th title={dic.squad.cols.momHint}>{dic.dna.lastCols.mom}</th>
                </tr>
              </thead>
              <tbody>
                {ultimas.map((p) => (
                  <tr key={p.matchId}>
                    <td>
                      <span className="player-cell">
                        <span className={`pill ${p.resultado}`} style={{ width: 26, height: 26 }}>
                          {p.resultado}
                        </span>
                        <span style={{ fontWeight: 620 }}>{p.adversario}</span>
                        <span style={{ color: 'var(--dim)' }}>
                          {p.placar} · {quando(p.timestamp)}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={`rating ${notaClasse(p.rating)}`}>{dec(p.rating, 2, dic)}</span>
                    </td>
                    <td>{p.goals}</td>
                    <td>{p.assists}</td>
                    <td>{p.shots}</td>
                    <td>{p.passe === null ? dic.common.na : pct(p.passe)}</td>
                    <td>{p.desarme === null ? dic.common.na : pct(p.desarme)}</td>
                    <td>{p.mom ? '⭐' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
