import { SITE } from '@/lib/config';

export const metadata = { title: 'Sobre' };

const FAQ = [
  {
    q: 'De onde vêm os dados?',
    a: 'Da API pública de Pro Clubs da EA, a mesma que alimenta o site oficial do EA FC. O servidor deste projeto consulta a EA e devolve o resultado já organizado para a página.',
  },
  {
    q: 'Por que às vezes um clube não aparece?',
    a: 'A busca da EA é exigente com o nome exato e separa os clubes por pool de plataforma. Se não achar, tente a grafia idêntica à do jogo e experimente trocar a plataforma no seletor ao lado do campo de busca.',
  },
  {
    q: 'Por que só aparecem as últimas partidas?',
    a: 'A EA guarda um histórico curto por clube nos endpoints públicos, normalmente as partidas mais recentes de liga e playoff. Nada além disso fica disponível.',
  },
  {
    q: 'Os escudos nem sempre carregam. Por quê?',
    a: 'A EA não publica um endereço oficial e estável para os escudos customizados. O site tenta alguns padrões conhecidos e, quando nenhum funciona, desenha um monograma com as cores do uniforme do clube.',
  },
  {
    q: 'Isso é oficial?',
    a: `Não. ${SITE.name} é um projeto de fã, sem qualquer vínculo, patrocínio ou aprovação da Electronic Arts. EA, EA SPORTS e EA FC são marcas da Electronic Arts Inc.`,
  },
];

export default function SobrePage() {
  return (
    <section className="block">
      <div className="wrap stack" style={{ gap: 26, maxWidth: 780 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>Sobre o {SITE.name}</h1>
          <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 17 }}>
            Um tracker de EA FC 26 Pro Clubs: você busca o clube pelo nome e recebe o
            elenco inteiro, o histórico recente e os números que dizem alguma coisa,
            sem precisar abrir o jogo.
          </p>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          {FAQ.map((f) => (
            <div className="panel pad" key={f.q}>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{f.q}</h3>
              <p style={{ color: 'var(--muted)' }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
