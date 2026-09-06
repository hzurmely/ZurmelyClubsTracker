'use client';

import { useState } from 'react';
import Link from 'next/link';
import RadarDNA from '@/components/RadarDNA';
import GraficoNotas from '@/components/GraficoNotas';
import { posLabel, initials, dec, nf, pct } from '@/lib/format';

function notaClasse(v) {
  if (v >= 7.8) return 'a';
  if (v >= 6.8) return 'b';
  return 'c';
}

/** Verde para nota alta, vermelho para nota baixa, neutro no meio. */
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
  const [modo, setModo] = useState(perfil.temTemporada ? 'season' : 'career');
  const recorte = perfil.recortes[modo] || perfil.recortes.season || perfil.recortes.career;
  const s = recorte?.stats;
  const j = perfil.jogador;
  const ultimas = [...perfil.partidas].reverse().slice(0, 12);

  const tiles = [
    { k: 'Partidas', v: nf(s?.gamesPlayed || 0) },
    { k: 'Gols', v: nf(s?.goals || 0), sub: s?.gamesPlayed ? `${dec((s.goals || 0) / s.gamesPlayed, 2)} por jogo` : null },
    { k: 'Assistências', v: nf(s?.assists || 0), sub: s?.gamesPlayed ? `${dec((s.assists || 0) / s.gamesPlayed, 2)} por jogo` : null },
    { k: 'Nota média', v: dec(s?.rating || 0, 2), nota: s?.rating || 0 },
    { k: 'Craque do jogo', v: nf(s?.mom || 0), sub: s?.gamesPlayed ? `${pct(((s.mom || 0) / s.gamesPlayed) * 100)} dos jogos` : null },
  ];

  if (modo === 'season' && s) {
    tiles.push(
      { k: 'Vitórias', v: pct(s.winRate || 0) },
      { k: 'Passe certo', v: pct(s.passSuccessRate || 0), sub: `${nf(s.passesMade || 0)} passes certos` },
      { k: 'Desarme certo', v: pct(s.tackleSuccessRate || 0), sub: `${nf(s.tacklesMade || 0)} desarmes` },
      { k: 'Finalização', v: pct(s.shotSuccessRate || 0) },
    );
    if (j.grupo === 'gk' || (s.cleanSheetsGK || 0) > 0) {
      tiles.push({ k: 'Gol fechado', v: nf(s.cleanSheetsGK || 0), sub: 'jogos sem sofrer' });
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
              Temporada
            </button>
            <button className={`tab ${modo === 'career' ? 'on' : ''}`} onClick={() => setModo('career')}>
              Carreira
            </button>
          </div>
        )}
      </div>

      <div className="panel pad atleta-dna">
        <div className="dna-selo">DNA</div>
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
        <p style={{ color: 'var(--dim)', fontSize: 13 }}>
          Na carreira a EA só publica partidas, gols, assistências, craque do jogo e nota
          média. Os percentuais existem apenas no recorte da temporada.
        </p>
      )}

      {recorte?.medalhas?.length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">Medalhas</div>
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
          <p className="nota-rodape">
            As de borda azul são disputadas dentro do elenco e podem trocar de dono. As
            de borda cinza são marcos do jogador e ficam. As de borda vermelha saíram das
            últimas partidas do clube.
          </p>
        </div>
      )}

      {perfil.temRadar && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">Onde ele é forte</div>
          <div className="panel pad">
            <RadarDNA eixos={perfil.eixos} nome={j.name} />
          </div>
          <p className="nota-rodape">
            O topo de cada eixo é o melhor do elenco naquele item, então o desenho
            responde onde ele está em relação aos companheiros, não se ele é bom em
            termos absolutos. A comparação usa os {perfil.elenco} jogadores com partidas
            na temporada. Gols e assistências entram por jogo, para não premiar apenas
            quem joga mais.
            {perfil.elenco < 3 &&
              ' Com esse número de jogadores registrados a comparação fica frouxa: quase todo mundo é o melhor do elenco em alguma coisa. Leia o desenho como um esboço, não como veredito.'}
          </p>
        </div>
      )}

      <div className="stack" style={{ gap: 12 }}>
        <div className="panel-title">Nota partida a partida</div>
        <div className="panel pad">
          <GraficoNotas partidas={perfil.partidas} media={perfil.resumo?.notaMedia} />
        </div>
        {perfil.resumo && (
          <p className="nota-rodape">
            Nas {perfil.resumo.jogos} partidas que a EA ainda guarda deste clube ele fez{' '}
            {perfil.resumo.gols} {perfil.resumo.gols === 1 ? 'gol' : 'gols'} e{' '}
            {perfil.resumo.assistencias}{' '}
            {perfil.resumo.assistencias === 1 ? 'assistência' : 'assistências'}, com nota
            média {dec(perfil.resumo.notaMedia, 2)} e {perfil.resumo.mom}{' '}
            {perfil.resumo.mom === 1 ? 'vez' : 'vezes'} como craque do jogo. O histórico
            público vai até as últimas partidas registradas, não a carreira inteira.
          </p>
        )}
      </div>

      {ultimas.length > 0 && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">Últimas atuações</div>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Partida</th>
                  <th>Nota</th>
                  <th title="Gols">G</th>
                  <th title="Assistências">A</th>
                  <th title="Finalizações">Chutes</th>
                  <th title="Acerto de passe">Passe</th>
                  <th title="Acerto de desarme">Desarme</th>
                  <th title="Craque do jogo">Craque</th>
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
                      <span className={`rating ${notaClasse(p.rating)}`}>{dec(p.rating, 2)}</span>
                    </td>
                    <td>{p.goals}</td>
                    <td>{p.assists}</td>
                    <td>{p.shots}</td>
                    <td>{p.passe === null ? 'n/d' : pct(p.passe)}</td>
                    <td>{p.desarme === null ? 'n/d' : pct(p.desarme)}</td>
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
