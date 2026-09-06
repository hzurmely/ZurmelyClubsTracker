import { SITE } from '@/lib/config';

export const metadata = { title: 'Sobre' };

const FAQ = [
  {
    q: 'De onde vêm os dados?',
    a: 'Da API pública de Pro Clubs da EA, a mesma que alimenta o site oficial do EA FC. O servidor deste projeto consulta a EA e devolve o resultado já organizado para a página. Nada aqui é estimado ou inventado.',
  },
  {
    q: 'Como a escalação ideal escolhe os onze?',
    a: 'Pela nota média de cada jogador ajustada pelo número de jogos: quem tem poucas partidas é puxado na direção da média do elenco, com peso equivalente a três jogos. Sem isso, alguém com duas partidas e nota 9 passaria na frente de quem sustenta 8,3 em cento e poucos jogos. Cada vaga puxa o melhor do setor dela e, se o setor acabar, entra o melhor sobrando marcado como improviso.',
  },
  {
    q: 'Por que o campo às vezes não tem onze jogadores?',
    a: 'Porque a EA só devolve os jogadores com partidas registradas, e a maioria dos clubes vem com menos de onze. Nesse caso o campo segue o elenco em vez de forçar uma formação fixa: só os setores que existem ocupam o gramado, e as abas de formação dão lugar a um aviso de formação automática.',
  },
  {
    q: 'O que o radar do DNA está medindo?',
    a: 'O topo de cada eixo é o melhor do elenco naquele item, então o desenho responde onde o jogador está em relação aos companheiros, e não se ele é bom em termos absolutos. Gols e assistências entram por jogo, para não premiar apenas quem joga mais. A figura cinza atrás é a média do elenco. Com menos de três jogadores registrados a comparação fica frouxa, e a página avisa.',
  },
  {
    q: 'Por que a análise da partida não mostra posse de bola?',
    a: 'Porque a EA não publica posse. Ela publica linha por linha de cada jogador, e todos os números de time da página são somados dali. O mais perto de posse é o volume de passes tentados, que aparece com esse nome e não fingindo ser outra coisa.',
  },
  {
    q: 'Por que só aparecem as últimas partidas?',
    a: 'A EA guarda um histórico curto por clube nos endpoints públicos, normalmente as partidas mais recentes de liga e playoff. É por isso também que o retrospecto contra um adversário só aparece quando ele surge mais de uma vez nesse recorte.',
  },
  {
    q: 'Por que os escudos são só as iniciais?',
    a: 'É de propósito. A EA não publica nenhum endereço acessível para os escudos customizados: os padrões que a comunidade usava foram todos ao ar. Em vez de tentar imagens que nunca carregam, o site desenha um monograma com as cores reais do uniforme, que a API entrega.',
  },
  {
    q: 'Tem versão para instalar no PC?',
    a: 'Tem, para Windows. É o mesmo site rodando na sua máquina, e fica mais rápido: a EA bloqueia faixas de IP de datacenter, então o site publicado precisa de um desvio que o programa em casa não usa.',
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
            elenco inteiro, a escalação ideal, os leaderboards, o DNA de cada jogador
            e a análise de cada partida, sem precisar abrir o jogo.
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
