# ZurmelyClubsTracker

Tracker de EA FC 26 Pro Clubs feito em Next.js. Você busca um clube pelo nome e o
site abre o elenco inteiro, a escalação ideal num campinho, os leaderboards do
elenco, o histórico de partidas, uma página de DNA para cada jogador e a análise
completa de cada jogo, com os dois times lado a lado.

Tudo vem da API pública de Pro Clubs da EA. Não tem banco de dados, não tem
cadastro, não tem chave de API.

Existe também um programa de desktop para Windows, que é a mesma coisa rodando na
sua máquina. Veja `desktop/COMO-EMPACOTAR.md`.

---

## O que tem dentro

**Página do clube.** Cabeçalho com as cores reais do uniforme, aproveitamento,
saldo de gols, sequências, forma recente, destaques do elenco e a tabela completa
de jogadores, ordenável e com filtro por setor.

**Escalação ideal.** Um campinho com os onze escolhidos pela nota de cada jogador
ajustada pelo número de jogos, para que quem jogou pouco não passe na frente de
quem sustenta o nível. Cada vaga puxa o melhor do setor dela; se o setor acabar,
entra o melhor sobrando e o card fica marcado como improviso. Formações 3-5-2,
4-3-3 e 4-4-2. Quando o elenco tem menos de onze jogadores com partidas
registradas, e isso é o normal, o campo segue o elenco em vez de uma formação
fixa: só os setores que existem ocupam o gramado.

**Leaderboards.** Sete abas dentro do elenco: nota, gols, assistências, craque do
jogo, passe, desarme e finalização. Corte de cinco partidas nas médias, para
amostra curta não roubar o topo, dispensado sozinho quando o elenco não tem gente
suficiente acima dele.

**DNA do atleta.** Página por jogador, em `/clube/<plataforma>/<id>/jogador/<nome>`.
Traz um arquétipo (Finalizador, Criador, Meio de ligação, Muralha e outros)
derivado dos dois eixos em que ele mais se destaca, um radar de seis eixos
comparando ele com a média do elenco, medalhas em três famílias (disputadas
dentro do elenco, marcos do jogador e feitos das últimas partidas), a evolução da
nota partida a partida e a tabela das últimas atuações.

**Análise da partida.** Em `/clube/<plataforma>/<id>/partida/<matchId>`. Placar,
uma leitura do jogo em frases geradas a partir dos números, melhor em campo dos
dois lados, comparativo lado a lado de oito itens, as duas escalações completas em
abas e o retrospecto contra aquele adversário quando ele aparece mais de uma vez
no histórico guardado.

**Comparação entre clubes** e **busca** com navegação por teclado.

---

## Rodando na sua máquina

Você precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

---

## Meu clube

Não precisa mexer em arquivo nenhum: abra a página do seu clube e clique em
**☆ Definir como meu clube**. A escolha fica salva no navegador (chave
`zct:meu-clube`) e o clube passa a aparecer num card na home, com aproveitamento,
gols por jogo e a forma recente. Clicar de novo desfaz.

Se você quiser fixar um clube para todo mundo que abrir o site, aí sim existem as
variáveis de ambiente:

```env
NEXT_PUBLIC_MY_CLUB_ID=123456
NEXT_PUBLIC_MY_CLUB_PLATFORM=common-gen5
```

O ID sai da própria URL do clube: `/clube/common-gen5/123456`.

Plataformas aceitas: `common-gen5` (PS5, Xbox Series, PC), `common-gen4`
(PS4, Xbox One) e `nx` (Switch).

---

## Publicando na Vercel

O projeto já sai pronto para a Vercel, porque as chamadas para a EA rodam em
route handlers do Next, que viram funções serverless automaticamente.

1. Suba o projeto para um repositório no GitHub.
2. Entre em <https://vercel.com>, clique em **Add New → Project** e importe o
   repositório.
3. Não mude nada nas configurações de build.
4. Deploy.

O plano gratuito dá conta tranquilamente.

---

## O bloqueio da EA, e como o site passa por ele

Tem um detalhe chato: a EA usa a Akamai na frente da API, e a Akamai devolve
`403 Access Denied` para requisições que saem das faixas de IP da Vercel. Não é
questão de cabeçalho, é bloqueio de rede: a resposta chega em menos de 100ms,
antes mesmo de a EA olhar o pedido. Do seu navegador, ou do `npm run dev` na sua
máquina, a mesma URL responde normalmente. As faixas da Cloudflare também estão
bloqueadas, então um Worker sozinho não resolve.

A saída está no próprio `lib/ea.js`. Ele tenta a EA direto, percorrendo as
variantes de cabeçalho. Se todas levarem 403, repete o pedido uma última vez pelo
leitor público `r.jina.ai`, que sai por uma faixa de IP que a EA aceita e devolve
o corpo da resposta intacto. Na sua máquina esse desvio nunca é usado, porque o
caminho direto funciona. Na Vercel ele entra em ação e o site funciona igual.

Para desligar o desvio, coloque `EA_LEITOR=0` nas variáveis de ambiente.

Se um dia você quiser tirar o leitor do caminho, existe um Cloudflare Worker
pronto em `worker/index.js`, que faz o mesmo papel com cache na borda:

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

Depois aponte o site para ele em **Settings → Environment Variables** da Vercel:

```env
EA_PROXY_URL=https://zurmely-ea-bridge.SEU-SUBDOMINIO.workers.dev
```

Hoje isso é opcional e está desligado: a Cloudflare está na mesma lista de
bloqueio da EA, então o Worker acaba caindo no mesmo desvio pelo leitor. O
programa de desktop não sofre disso, porque roda no IP da sua casa.

---

## Por que existe um servidor no meio

A API da EA (`proclubs.ea.com/api/fc/...`) não manda cabeçalhos de CORS e
rejeita requisições que não tenham um `Referer` da EA. Um site puramente
estático, chamando a API direto do navegador, simplesmente não funciona.

Por isso todo acesso passa por `lib/ea.js`, que roda no servidor. As páginas
de clube, jogador e partida são componentes de servidor e chamam essas funções
diretamente; a busca, que acontece enquanto você digita, passa por
`/api/ea/search`.

Cada resposta fica em cache por 60 segundos, o que deixa a navegação rápida e
evita bater na EA a cada clique.

---

## O que a EA publica, e o que ela não publica

Vale saber para não esperar o que não existe:

- **Não existe posse de bola.** O comparativo da partida mostra volume de passes
  tentados, com esse nome, que é o mais perto disso.
- **Não existe estatística de time por partida.** Os totais dos dois lados são
  somados linha a linha dos jogadores.
- **Não existe histórico completo.** Só as últimas partidas de liga e playoff. Por
  isso o retrospecto contra um adversário às vezes não aparece.
- **Não existe endpoint de partida por id.** A página da partida busca as duas
  listas e procura ali dentro.
- **A carreira vem sem percentuais.** Passe, desarme, finalização e vitórias só
  existem no recorte da temporada, e por isso as tabelas trocam de colunas junto
  com o modo em vez de mostrar zero falso.
- **O elenco só traz quem tem partida registrada.** Clube com seis jogadores na
  API é o normal, não é erro.

---

## Modo demonstração

A API da EA cai de vez em quando (dias inteiros, às vezes). Para conseguir
mexer no layout mesmo assim, coloque no `.env.local`:

```env
EA_DEMO=1
```

O site passa a usar os dados fictícios de `lib/demo.js` e mostra um aviso
amarelo no topo da página do clube, para ninguém confundir com dado real.
Volte para `EA_DEMO=0` quando terminar. Tome cuidado para não fazer o build do
desktop com essa variável ligada: os dados falsos entram no executável.

---

## Estrutura

```
app/
  page.jsx                            home: busca + card do meu clube
  clube/[platform]/[id]/              pagina do clube
    jogador/[nome]/                   DNA do atleta
    partida/[matchId]/                analise da partida
  comparar/                           comparacao entre dois clubes
  sobre/                              perguntas frequentes
  api/ea/search/                      busca (usada pelo campo de busca)
  api/ea/club/                        dossie completo (usado na comparacao)
  api/ea/meu-clube/                   resumo curto para o card da home
  api/ea/diag/                        diagnostico do bloqueio da EA
  globals.css                         tema inteiro, em variaveis CSS
components/
  SearchBar.jsx                       busca com debounce e teclado
  ClubHeader.jsx                      cabecalho com escudo e cores do uniforme
  StatCards.jsx                       cards, forma recente e destaques
  BestEleven.jsx                      campinho da escalacao ideal
  Leaderboards.jsx                    rankings do elenco em sete abas
  PlayersTable.jsx                    tabela de elenco, ordenavel e filtravel
  DnaAtleta.jsx                       pagina do jogador
  RadarDNA.jsx                        radar de seis eixos, em SVG
  GraficoNotas.jsx                    nota partida a partida, em SVG
  ComparativoPartida.jsx              barras lado a lado dos dois times
  ElencosPartida.jsx                  as duas escalacoes de um jogo
  MatchList.jsx                       partidas recentes
  MeuClube.jsx                        card do meu clube na home
  DefinirMeuClube.jsx                 botao de marcar o clube
  Crest.jsx                           escudo desenhado com as cores do uniforme
  Compare.jsx                         tela de comparacao
lib/
  ea.js                               cliente da API da EA
  dossier.js                          junta info + stats + elenco + partidas
  escalacao.js                        escolhe os onze e monta o campo
  dna.js                              eixos do radar, medalhas e arquetipo
  partida.js                          totais, comparativo e leitura do jogo
  meuClube.js                         meu clube salvo no navegador
  format.js                           formatacao (divisoes, posicoes, cores)
  config.js                           nome do site, clube fixo, plataformas
  demo.js                             dados ficticios do modo demonstracao
desktop/
  main.js                             casca Electron do programa de Windows
  COMO-EMPACOTAR.md                   receita do executavel
worker/
  index.js                            ponte opcional em Cloudflare Worker
```

---

## Mudando a cara do site

Quase tudo está em variáveis no topo de `app/globals.css`:

```css
--brand-blue: #2b7fff;  /* o "Zurmely" */
--brand-red:  #ff3b4e;  /* o "Tracker" */
--accent:     #2b7fff;  /* cor principal da interface */
--rival:      #d2762d;  /* o adversario no comparativo da partida */
--bg:         #07080b;  /* fundo */
```

O par `--accent` e `--rival` foi escolhido passando por um validador de paleta:
faixa de luminosidade, croma, contraste contra o painel e separação sob
daltonismo. Se você trocar essas duas, vale conferir se continuam distinguíveis.

O nome e o slogan saem de `NEXT_PUBLIC_SITE_NAME` e `NEXT_PUBLIC_SITE_TAGLINE`.

---

## Problemas comuns

**"A API da EA não respondeu agora"**
Pode ser instabilidade do lado da EA, ou bloqueio de IP. Abra `/api/ea/diag` no
site publicado: ele bate na EA com três conjuntos de cabeçalhos, testa também o
desvio pelo leitor e mostra o status de cada tentativa. Três respostas 403 em
poucos milissegundos significam bloqueio de rede, e a saída é o desvio descrito
acima. Se der erro de conexão ou timeout, aí sim é a EA que está fora.

**O clube não aparece na busca**
A busca da EA é exigente com a grafia. Digite o nome idêntico ao do jogo,
inclusive espaços e símbolos, e experimente trocar a plataforma no seletor.

**Os escudos são só as iniciais**
É de propósito. A EA não publica nenhum endereço acessível para os escudos
customizados: os padrões que a comunidade usava foram todos ao ar, e os trackers
grandes também não exibem o escudo de verdade. Em vez de tentar imagens que nunca
carregam, o `Crest.jsx` desenha um monograma com as cores reais do uniforme, que
a API entrega. Se um dia aparecer uma URL que funcione, é só voltar a renderizar
um `<img>` e deixar o desenho como reserva.

**Poucas partidas no histórico**
A EA só expõe as partidas mais recentes de liga e playoff. Não existe histórico
completo na API pública.

**O jogador não aparece na página de DNA**
A EA só devolve quem tem partida registrada no clube. Quem saiu ou ainda não
jogou não aparece, e a página diz isso em vez de mostrar um perfil vazio.

---

## Aviso

Projeto de fã, sem qualquer vínculo, patrocínio ou aprovação da Electronic Arts.
EA, EA SPORTS e EA FC são marcas da Electronic Arts Inc. Os dados vêm de
endpoints públicos e não oficiais, que a EA pode mudar ou desligar a qualquer
momento.
