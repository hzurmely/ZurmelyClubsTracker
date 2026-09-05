import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import Crest from '@/components/Crest';
import { FormStrip } from '@/components/StatCards';
import { SITE, MY_CLUB } from '@/lib/config';
import { getClubDossier, summarize } from '@/lib/dossier';
import { nf, pct, dec } from '@/lib/format';

export const revalidate = 60;

const FEATURES = [
  {
    ico: '⚡',
    title: 'Dados direto da EA',
    text: 'Busca em tempo real nos servidores do EA FC 26, em todas as plataformas de uma vez.',
  },
  {
    ico: '📊',
    title: 'Elenco por completo',
    text: 'Gols, assistências, nota média, acerto de passe e desarme de cada jogador, com tabela ordenável.',
  },
  {
    ico: '🎯',
    title: 'Últimas partidas',
    text: 'Placar, adversário e o desempenho individual de quem entrou em campo em cada jogo.',
  },
  {
    ico: '⚔️',
    title: 'Comparação direta',
    text: 'Coloque dois clubes lado a lado e veja quem leva a melhor em cada número.',
  },
];

export default async function Home() {
  let mine = null;
  if (MY_CLUB.id) {
    try {
      const dossier = await getClubDossier(MY_CLUB.platform, MY_CLUB.id);
      if (dossier.info) mine = { dossier, summary: summarize(dossier) };
    } catch {
      mine = null;
    }
  }

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow">EA FC 26 · Pro Clubs</span>
          <h1>
            Todo número do seu clube,
            <br />
            <span className="grad">num lugar só.</span>
          </h1>
          <p className="lead">
            {SITE.tagline}. Busque qualquer clube pelo nome e veja elenco, histórico e
            forma recente em segundos.
          </p>
          <SearchBar autoFocus />
        </div>
      </section>

      {mine && (
        <section className="block">
          <div className="wrap stack">
            <div className="panel-title">Meu clube</div>
            <Link
              href={`/clube/${MY_CLUB.platform}/${MY_CLUB.id}`}
              className="panel pad"
              style={{ display: 'block' }}
            >
              <div className="row row-wrap" style={{ gap: 20 }}>
                <Crest club={mine.dossier.info} size={72} radius={18} />
                <div className="grow stack" style={{ gap: 6 }}>
                  <h2 style={{ fontSize: 26 }}>{mine.dossier.info.name}</h2>
                  <div className="row row-wrap" style={{ gap: 16, color: 'var(--muted)' }}>
                    <span>
                      <strong style={{ color: 'var(--text)' }}>
                        {nf(mine.dossier.overall?.gamesPlayed)}
                      </strong>{' '}
                      jogos
                    </span>
                    <span>
                      Aproveitamento{' '}
                      <strong style={{ color: 'var(--accent)' }}>
                        {pct(mine.summary.aproveitamento)}
                      </strong>
                    </span>
                    <span>
                      Média de gols{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        {dec(mine.summary.golsPorJogo, 2)}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <span className="lbl" style={{ fontSize: 11, letterSpacing: '.13em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Forma
                  </span>
                  <FormStrip form={mine.summary.form.slice(0, 6)} />
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {!MY_CLUB.id && (
        <section className="block">
          <div className="wrap">
            <div className="banner">
              <span>💡</span>
              <span>
                Quer o seu clube fixo aqui na home? Busque ele acima, copie o ID que
                aparece na URL e coloque em <code>NEXT_PUBLIC_MY_CLUB_ID</code> no
                arquivo <code>.env.local</code>.
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="block">
        <div className="wrap stack">
          <div className="panel-title">O que dá pra ver aqui</div>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <div className="ico">{f.ico}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
