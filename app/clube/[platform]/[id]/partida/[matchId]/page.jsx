import Link from 'next/link';
import Crest from '@/components/Crest';
import ComparativoPartida from '@/components/ComparativoPartida';
import ElencosPartida from '@/components/ElencosPartida';
import { clubInfo, matchDetail, isDemo } from '@/lib/ea';
import { demo } from '@/lib/demo';
import { analisarPartida } from '@/lib/partida';
import { dec, nf } from '@/lib/format';

export const revalidate = 60;

function dataLonga(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString('pt-BR', {
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
    if (!partida) return { title: `Partida · ${info?.name || id}` };
    return {
      title: `${info?.name || id} ${partida.goalsFor} x ${partida.goalsAgainst} ${partida.opponent.name}`,
    };
  } catch {
    return { title: 'Partida' };
  }
}

export default async function PartidaPage({ params }) {
  const { platform, id, matchId } = await params;
  const { info, partida, todas } = await buscar(platform, id, matchId);

  if (!partida) {
    return (
      <section className="block">
        <div className="wrap stack" style={{ gap: 20 }}>
          <div className="banner err">
            <span>⚠️</span>
            <span>
              Não achei essa partida no histórico de{' '}
              <strong>{info?.name || `clube ${id}`}</strong>. A EA guarda só as últimas
              partidas de liga e playoff, então jogos antigos somem da API com o tempo.
            </span>
          </div>
          <Link href={`/clube/${platform}/${id}`} className="btn ghost" style={{ alignSelf: 'flex-start' }}>
            Voltar para o clube
          </Link>
        </div>
      </section>
    );
  }

  const analise = analisarPartida({ partida, todas, clube: info });
  const { meu, dele } = analise.times;
  const r = analise.retrospecto;

  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 26 }}>
        <Link href={`/clube/${platform}/${id}`} className="voltar">
          ← {info?.name || `Clube ${id}`}
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
            <span>{partida.matchType}</span>
            <span>·</span>
            <span>{dataLonga(partida.timestamp)}</span>
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
            <div className="leitura-selo">O JOGO</div>
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
                  <div className="lbl">Melhor do {i === 0 ? 'time' : 'adversário'}</div>
                  <div className="who">{t.mvp.name}</div>
                  <div className="lbl">
                    {t.mvp.goals ? `${t.mvp.goals}G ` : ''}
                    {t.mvp.assists ? `${t.mvp.assists}A ` : ''}
                    {t.mvp.saves ? `${t.mvp.saves} defesas` : ''}
                    {!t.mvp.goals && !t.mvp.assists && !t.mvp.saves ? t.nome : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="n">{dec(t.mvp.rating, 2)}</div>
                  <div className="lbl">nota</div>
                </div>
              </div>
            ) : null,
          )}
          <div className="leader">
            <div className="grow">
              <div className="lbl">Aproveitamento de finalização</div>
              <div className="who">
                {meu.totais.finalizacoes} {meu.totais.finalizacoes === 1 ? 'chute' : 'chutes'}
              </div>
              <div className="lbl">{meu.nome}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="n">
                {Number.isFinite(meu.totais.aproveitamentoChute)
                  ? `${Math.round(meu.totais.aproveitamentoChute)}%`
                  : 'n/d'}
              </div>
              <div className="lbl">viraram gol</div>
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <div className="panel-title">Números da partida</div>
          <ComparativoPartida
            linhas={analise.comparativo}
            nomeMeu={meu.nome}
            nomeDele={dele.nome}
          />
        </div>

        <ElencosPartida meu={meu} dele={dele} platform={platform} />

        {r && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="panel-title">Retrospecto contra {dele.nome}</div>
            <div className="grid-3">
              <div className="stat">
                <div className="k">Confrontos guardados</div>
                <div className="v">{nf(r.jogos)}</div>
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
                <div className="k">Saldo no confronto</div>
                <div className={`v ${r.golsPro - r.golsContra >= 0 ? 'good' : 'bad'}`}>
                  {r.golsPro - r.golsContra > 0 ? '+' : ''}
                  {nf(r.golsPro - r.golsContra)}
                </div>
                <div className="sub">
                  {r.golsPro} marcados · {r.golsContra} sofridos
                </div>
              </div>
              <div className="stat">
                <div className="k">Média de gols</div>
                <div className="v">{dec(r.golsPro / r.jogos, 2)}</div>
                <div className="sub">sofre {dec(r.golsContra / r.jogos, 2)} por jogo</div>
              </div>
            </div>

            <div className="panel">
              <ul className="confrontos">
                {r.lista.map((m) => (
                  <li key={m.matchId} className={m.atual ? 'atual' : ''}>
                    <span className={`pill ${m.result}`}>{m.result}</span>
                    <span className="grow">
                      {m.atual ? (
                        <b>esta partida</b>
                      ) : (
                        <Link href={`/clube/${platform}/${id}/partida/${m.matchId}`}>
                          {m.matchType}
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

            <p className="nota-rodape">
              O retrospecto sai só do que a EA ainda publica, que são as últimas partidas
              de liga e playoff do clube. Jogos mais antigos contra esse mesmo adversário
              podem existir e não aparecer aqui.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
