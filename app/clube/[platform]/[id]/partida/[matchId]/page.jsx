import Link from 'next/link';
import Crest from '@/components/Crest';
import ComparativoPartida from '@/components/ComparativoPartida';
import ElencosPartida from '@/components/ElencosPartida';
import { clubInfo, matchDetail, isDemo } from '@/lib/ea';
import { demo } from '@/lib/demo';
import { analisarPartida } from '@/lib/partida';
import { currentDictionary } from '@/lib/i18n/server';
import { dec, nf } from '@/lib/format';

export const revalidate = 60;

function dataLonga(ts, dic) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString(dic.htmlLang, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

async function buscar(platform, id, matchId) {
  if (isDemo()) {
    const todas = demo.matches(id);
    return {
      info: demo.club(platform, id),
      partida: todas.find((m) => m.matchId === String(matchId)) || null,
      todas,
    };
  }
  const [infoR, detalheR] = await Promise.allSettled([
    clubInfo(platform, id),
    matchDetail(platform, id, matchId),
  ]);
  const detalhe = detalheR.status === 'fulfilled' ? detalheR.value : { partida: null, todas: [] };
  return {
    info: infoR.status === 'fulfilled' ? infoR.value : null,
    partida: detalhe.partida,
    todas: detalhe.todas,
  };
}

export async function generateMetadata({ params }) {
  const { platform, id, matchId } = await params;
  try {
    const { info, partida } = await buscar(platform, id, matchId);
    if (!partida) return { title: info?.name || `#${id}` };
    return {
      title: `${info?.name || id} ${partida.goalsFor} x ${partida.goalsAgainst} ${partida.opponent.name}`,
    };
  } catch {
    return { title: `#${matchId}` };
  }
}

export default async function PartidaPage({ params }) {
  const { platform, id, matchId } = await params;
  const dic = await currentDictionary();
  const { info, partida, todas } = await buscar(platform, id, matchId);

  if (!partida) {
    return (
      <section className="block">
        <div className="wrap stack" style={{ gap: 20 }}>
          <div className="banner err">
            <span>⚠️</span>
            <span>
              {dic.match.notFoundA} <strong>{info?.name || `#${id}`}</strong>.{' '}
              {dic.match.notFoundHelp}
            </span>
          </div>
          <Link href={`/clube/${platform}/${id}`} className="btn ghost" style={{ alignSelf: 'flex-start' }}>
            {dic.common.backClub}
          </Link>
        </div>
      </section>
    );
  }

  const analise = analisarPartida({ partida, todas, clube: info, dic });
  const { meu, dele } = analise.times;
  const r = analise.retrospecto;

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 26 }}>
        <Link href={`/clube/${platform}/${id}`} className="voltar">
          ← {info?.name || `#${id}`}
        </Link>

        <div className="panel pad placar">
          <div className="lado">
            <Crest club={{ ...meu, name: meu.nome }} size={54} radius={14} />
            <span className="nome">{meu.nome}</span>
          </div>

          <div className="numeros">
            <span className={`n ${partida.result === 'V' ? 'ganhou' : ''}`}>{meu.gols}</span>
            <span className="x">x</span>
            <span className={`n ${partida.result === 'D' ? 'ganhou' : ''}`}>{dele.gols}</span>
          </div>

          <div className="lado dir">
            <span className="nome">
              {dele.clubId ? (
                <Link href={`/clube/${platform}/${dele.clubId}`}>{dele.nome}</Link>
              ) : (
                dele.nome
              )}
            </span>
            <Crest club={{ ...dele, name: dele.nome }} size={54} radius={14} />
          </div>

          <div className="ficha">
            <span className={`pill ${partida.result}`}>{partida.result}</span>
            <span>{partida.matchType === 'Playoff' ? dic.matches.playoff : dic.matches.league}</span>
            <span>·</span>
            <span>{dataLonga(partida.timestamp, dic)}</span>
            {partida.stadium ? (
              <>
                <span>·</span>
                <span>{partida.stadium}</span>
              </>
            ) : null}
          </div>
        </div>

        {analise.leitura.length > 0 && (
          <div className="panel pad leitura">
            <div className="leitura-selo">{dic.match.badge}</div>
            <ul>
              {analise.leitura.map((frase, i) => (
                <li key={i}>{frase}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid-3">
          {[meu, dele].map((t, i) =>
            t.mvp ? (
              <div className="leader" key={t.nome + i}>
                <div className="grow">
                  <div className="lbl">{i === 0 ? dic.match.mvpHome : dic.match.mvpAway}</div>
                  <div className="who">{t.mvp.name}</div>
                  <div className="lbl">
                    {t.mvp.goals ? `${t.mvp.goals}G ` : ''}
                    {t.mvp.assists ? `${t.mvp.assists}A ` : ''}
                    {t.mvp.saves ? dic.match.saves(t.mvp.saves) : ''}
                    {!t.mvp.goals && !t.mvp.assists && !t.mvp.saves ? t.nome : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="n">{dec(t.mvp.rating, 2, dic)}</div>
                  <div className="lbl">{dic.common.rating}</div>
                </div>
              </div>
            ) : null,
          )}
          <div className="leader">
            <div className="grow">
              <div className="lbl">{dic.match.shotConv}</div>
              <div className="who">{dic.match.shots(meu.totais.finalizacoes)}</div>
              <div className="lbl">{meu.nome}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="n">
                {Number.isFinite(meu.totais.aproveitamentoChute)
                  ? `${Math.round(meu.totais.aproveitamentoChute)}%`
                  : dic.common.na}
              </div>
              <div className="lbl">{dic.match.turnedIntoGoals}</div>
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">{dic.match.numbersTitle}</div>
          <ComparativoPartida
            linhas={analise.comparativo}
            nomeMeu={meu.nome}
            nomeDele={dele.nome}
            dic={dic}
          />
        </div>

        <ElencosPartida meu={meu} dele={dele} platform={platform} />

        {r && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="panel-title">{dic.match.retrospectTitle(dele.nome)}</div>
            <div className="grid-3">
              <div className="stat">
                <div className="k">{dic.match.meetings}</div>
                <div className="v">{nf(r.jogos, dic)}</div>
                <div className="sub">
                  {r.v}V · {r.e}E · {r.d}D
                </div>
                <div className="bar">
                  <i className="w" style={{ width: `${(r.v / r.jogos) * 100}%` }} />
                  <i className="d" style={{ width: `${(r.e / r.jogos) * 100}%` }} />
                  <i className="l" style={{ width: `${(r.d / r.jogos) * 100}%` }} />
                </div>
              </div>
              <div className="stat">
                <div className="k">{dic.match.balance}</div>
                <div className={`v ${r.golsPro - r.golsContra >= 0 ? 'good' : 'bad'}`}>
                  {r.golsPro - r.golsContra > 0 ? '+' : ''}
                  {nf(r.golsPro - r.golsContra, dic)}
                </div>
                <div className="sub">
                  {r.golsPro} {dic.match.scored} · {r.golsContra} {dic.match.conceded}
                </div>
              </div>
              <div className="stat">
                <div className="k">{dic.match.goalsAvg}</div>
                <div className="v">{dec(r.golsPro / r.jogos, 2, dic)}</div>
                <div className="sub">{dic.match.concedes(dec(r.golsContra / r.jogos, 2, dic))}</div>
              </div>
            </div>

            <div className="panel">
              <ul className="confrontos">
                {r.lista.map((m) => (
                  <li key={m.matchId} className={m.atual ? 'atual' : ''}>
                    <span className={`pill ${m.result}`}>{m.result}</span>
                    <span className="grow">
                      {m.atual ? (
                        <b>{dic.match.thisMatch}</b>
                      ) : (
                        <Link href={`/clube/${platform}/${id}/partida/${m.matchId}`}>
                          {m.matchType === 'Playoff' ? dic.matches.playoff : dic.matches.league}
                        </Link>
                      )}
                    </span>
                    <span className="conf-placar">
                      {m.goalsFor} x {m.goalsAgainst}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="nota-rodape">{dic.match.retrospectNote}</p>
          </div>
        )}
      </div>
    </section>
  );
}
