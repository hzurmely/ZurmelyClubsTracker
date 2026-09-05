# ZurmelyClubsTracker

Tracker de EA FC 26 Pro Clubs feito em Next.js. Você busca um clube pelo nome, e o site
mostra o elenco completo com estatísticas de carreira, o histórico de partidas
recentes, a forma do time e uma comparação lado a lado entre dois clubes.

Tudo vem da API pública de Pro Clubs da EA.

---

## Rodando na sua máquina

Você precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

Só isso. Não tem banco de dados, não tem chave de API, não tem cadastro.

---

## Colocando o seu clube em destaque

1. Rode o site e busque o seu clube pelo nome exato do jogo.
2. Clique no resultado. A URL vai ficar assim:
   `/clube/common-gen5/123456`. O número final é o ID do clube.
3. Crie um arquivo `.env.local` na raiz do projeto (copie o `.env.example`) e
   preencha:

```env
NEXT_PUBLIC_MY_CLUB_ID=123456
NEXT_PUBLIC_MY_CLUB_PLATFORM=common-gen5
```

4. Reinicie o `npm run dev`. O clube passa a aparecer na home e no menu.

Plataformas aceitas: `common-gen5` (PS5, Xbox Series, PC), `common-gen4`
(PS4, Xbox One) e `nx` (Switch).

---

## Publicando na Vercel

O projeto já sai pronto para a Vercel, porque as chamadas para a EA rodam em
route handlers do Next, que viram funções serverless automaticamente.

1. Suba o projeto para um repositório no GitHub.
2. Entre em <https://vercel.com>, clique em **Add New → Project** e importe o
   repositório.
3. Não mude nada nas configurações de build. Se você usa o clube em destaque,
   adicione as variáveis `NEXT_PUBLIC_MY_CLUB_ID` e
   `NEXT_PUBLIC_MY_CLUB_PLATFORM` em **Settings → Environment Variables**.
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

Hoje isso é opcional: a Cloudflare está na mesma lista de bloqueio da EA, então o
Worker acaba caindo no mesmo desvio.

---

## Quando a EA bloqueia o servidor

A EA recusa conexoes vindas de faixas de IP de datacenter. Rodando na sua
maquina tudo funciona. Publicado na Vercel, a EA responde "Access Denied" em
menos de 100ms, direto da borda da Akamai, com qualquer conjunto de cabecalhos.
Nao e a EA fora do ar e nao e cabecalho: e a faixa de IP.

Abra `/api/ea/diag` no site publicado para conferir isso a qualquer momento.
Ele testa tres conjuntos de cabecalhos e diz o que voltou em cada um.

A saida e a ponte em `worker/index.js`, um Cloudflare Worker que busca os dados
de outra faixa de IP e devolve com CORS liberado. Ele aceita apenas os seis
caminhos que o site usa e nao guarda nada.

### Publicando a ponte

1. Crie uma conta gratis em <https://dash.cloudflare.com>.
2. Va em Compute, depois Workers e Pages, e clique em Create.
3. Escolha comecar do Hello World, de o nome `zurmely-ea-bridge` e faca o deploy.
4. Entre em Edit code, apague o exemplo e cole o conteudo de `worker/index.js`.
5. Abra o endereco que a Cloudflare gerou. Tem que responder um JSON com `ok: true`.
6. Na Vercel, em Settings e Environment Variables, crie `EA_PROXY_URL` com esse endereco.
7. Faca um novo deploy para a variavel valer.

Com `EA_PROXY_URL` vazia ou ausente o site fala direto com a EA, que e o certo
para rodar na sua maquina.

---

## Por que existe um servidor no meio

A API da EA (`proclubs.ea.com/api/fc/...`) não manda cabeçalhos de CORS e
rejeita requisições que não tenham um `Referer` da EA. Um site puramente
estático, chamando a API direto do navegador, simplesmente não funciona.

Por isso todo acesso passa por `lib/ea.js`, que roda no servidor. As páginas
de clube são componentes de servidor e chamam essas funções diretamente; a
busca, que acontece enquanto você digita, passa por `/api/ea/search`.

Cada resposta fica em cache por 60 segundos, o que deixa a navegação rápida e
evita bater na EA a cada clique.

---

## Modo demonstração

A API da EA cai de vez em quando (dias inteiros, às vezes). Para conseguir
mexer no layout mesmo assim, coloque no `.env.local`:

```env
EA_DEMO=1
```

O site passa a usar os dados fictícios de `lib/demo.js` e mostra um aviso
amarelo no topo da página do clube, para ninguém confundir com dado real.
Volte para `EA_DEMO=0` quando terminar.

---

## Estrutura

```
app/
  page.jsx                     home: busca + clube em destaque
  clube/[platform]/[id]/       página do clube
  comparar/                    comparação entre dois clubes
  sobre/                       perguntas frequentes
  api/ea/search/               busca (usada pelo campo de busca)
  api/ea/club/                 dossiê completo de um clube (usado na comparação)
  globals.css                  tema inteiro, em variáveis CSS
components/
  SearchBar.jsx                busca com debounce e navegação por teclado
  ClubHeader.jsx               cabeçalho com escudo e cores do uniforme
  StatCards.jsx                cards de estatística, forma recente e destaques
  PlayersTable.jsx             tabela de elenco, ordenável e com filtro por setor
  MatchList.jsx                partidas recentes, expandindo para a escalação
  Crest.jsx                    escudo, com fallback em monograma
  Compare.jsx                  tela de comparação
lib/
  ea.js                        cliente da API da EA
  dossier.js                   junta info + stats + elenco + partidas
  format.js                    formatação (divisões, posições, porcentagens)
  config.js                    nome do site, clube em destaque, plataformas
  demo.js                      dados fictícios do modo demonstração
worker/
  index.js                     ponte opcional em Cloudflare Worker
```

---

## Mudando a cara do site

Quase tudo está em variáveis no topo de `app/globals.css`:

```css
--brand-blue: #2b7fff;  /* o "Zurmely" */
--brand-red:  #ff3b4e;  /* o "Tracker" */
--accent:     #2b7fff;  /* cor principal da interface */
--bg:         #07080b;  /* fundo */
```

Troque essas três e o site inteiro muda de identidade. O nome e o slogan saem
de `NEXT_PUBLIC_SITE_NAME` e `NEXT_PUBLIC_SITE_TAGLINE` no `.env.local`.

---

## Problemas comuns

**"A API da EA não respondeu agora"**
Pode ser instabilidade do lado da EA, ou bloqueio de IP. Abra `/api/ea/diag` no
site publicado: ele bate na EA com três conjuntos de cabeçalhos e mostra o status
de cada tentativa. Três respostas 403 em poucos milissegundos significam bloqueio
de rede, e aí quem salva é o desvio pelo leitor, descrito acima. Se der erro de
conexão ou timeout, aí sim é a EA que está fora.

**O clube não aparece na busca**
A busca da EA é exigente com a grafia. Digite o nome idêntico ao do jogo,
inclusive espaços e símbolos, e experimente trocar a plataforma no seletor.

**Os escudos não carregam**
A EA não publica um endereço oficial e estável para os escudos customizados.
O `Crest.jsx` tenta alguns padrões conhecidos, em ordem, e cai num monograma
com as cores do uniforme quando nenhum funciona. Se você descobrir uma URL nova
que funcione, basta adicioná-la na lista `candidates()` daquele arquivo.

**Poucas partidas no histórico**
A EA só expõe as partidas mais recentes de liga e playoff. Não existe histórico
completo na API pública.

---

## Aviso

Projeto de fã, sem qualquer vínculo, patrocínio ou aprovação da Electronic Arts.
EA, EA SPORTS e EA FC são marcas da Electronic Arts Inc. Os dados vêm de
endpoints públicos e não oficiais, que a EA pode mudar ou desligar a qualquer
momento.
