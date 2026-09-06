# ZurmelyClubsTracker

An EA FC 26 Pro Clubs tracker built with Next.js. Search a club by name and the
site opens the whole squad, the best eleven on a pitch, the squad leaderboards,
the match history, a DNA page for every player and the full analysis of every
match, with both teams side by side.

Everything comes from the public EA Pro Clubs API. No database, no sign up, no
API key.

The interface ships in **English and Portuguese**, and there is a Windows
desktop program that is the same site running on your own machine. See
`desktop/PACKAGING.md`.

---

## What is inside

**Club page.** Header in the real kit colours, points won, goal difference,
streaks, recent form, squad highlights and the full player table, sortable and
filterable by sector.

**Best eleven.** A pitch with the eleven picked by each player average rating
adjusted for games played, so that a short run does not jump ahead of whoever
holds the level. Each slot pulls the best player of its own sector; when that
sector runs out, the best player left comes in flagged as out of position.
Formations 3-5-2, 4-3-3 and 4-4-2. When the squad has fewer than eleven players
with games on record, which is the normal case, the pitch follows the squad
instead of a fixed formation: only the sectors that exist take up the grass.

**Leaderboards.** Seven tabs inside the squad: rating, goals, assists, man of
the match, passing, tackling and finishing. A five game cut on the averages, so
a short sample cannot steal the top spot, waived automatically when the squad
does not have enough players above it.

**Athlete DNA.** One page per player, at
`/clube/<platform>/<id>/jogador/<name>`. It carries an archetype (Finisher,
Creator, Link man, Stopper and others) derived from the two axes where he stands
out most, a six axis radar comparing him with the squad average, medals in three
families (contested inside the squad, the player own milestones, and feats from
the latest matches), the rating trend match by match and a table of his latest
performances.

**Match analysis.** At `/clube/<platform>/<id>/partida/<matchId>`. Scoreline, a
reading of the game in sentences generated from the numbers, best on the pitch
for both sides, an eight row side by side comparison, both full lineups in tabs,
and the head to head against that opponent when they show up more than once in
the stored history.

**Club comparison** and a **search** with keyboard navigation.

---

## Running it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

---

## Language

Two languages ship with the site: Portuguese and English. On a first visit the
language comes from the browser `Accept-Language` header, so a Portuguese
browser gets Portuguese and everyone else gets English. The **PT / EN** switch in
the top bar overrides that, and the choice is stored in the `zct_lang` cookie for
a year.

Because the cookie is read on the server before rendering, there is no flash of
the wrong language, and the pages that server render (club, player, match) come
back already translated.

Adding a language means two things: a new file under `lib/i18n/` following the
shape of `pt.js`, and one line in `DICTIONARIES` inside
`lib/i18n/dictionaries.js`. The two dictionaries are kept key for key identical
on purpose, so a missing string is easy to spot.

The number formatting follows the language too: Portuguese writes `8,30` and
`1.995`, English writes `8.30` and `1,995`.

Note that the URL paths stay in Portuguese (`/clube`, `/jogador`, `/partida`,
`/comparar`, `/sobre`). They are identifiers, not copy: renaming them would break
every link already out there and the installed desktop program.

---

## My club

No file to edit: open your club page and click **☆ Set as my club**. The choice
is stored in the browser (key `zct:meu-clube`) and the club shows up in a card on
the home page with points won, goals per game and recent form. Clicking again
undoes it.

To pin a club for everyone who opens the site, there are environment variables:

```env
NEXT_PUBLIC_MY_CLUB_ID=123456
NEXT_PUBLIC_MY_CLUB_PLATFORM=common-gen5
```

The ID comes from the club URL itself: `/clube/common-gen5/123456`.

Accepted platforms: `common-gen5` (PS5, Xbox Series, PC), `common-gen4`
(PS4, Xbox One) and `nx` (Switch).

---

## Deploying to Vercel

The project is ready for Vercel out of the box, because the EA calls run in Next
route handlers, which become serverless functions automatically.

1. Push the project to a GitHub repository.
2. Go to <https://vercel.com>, click **Add New → Project** and import the repo.
3. Change nothing in the build settings.
4. Deploy.

The free plan handles it comfortably.

---

## The EA block, and how the site gets around it

There is an annoying detail: EA runs Akamai in front of the API, and Akamai
returns `403 Access Denied` for requests coming from Vercel IP ranges. It is not
a header problem, it is a network block: the answer arrives in under 100ms,
before EA even looks at the request. From your browser, or from `npm run dev` on
your own machine, the same URL answers normally. Cloudflare ranges are blocked
too, so a Worker on its own does not solve it.

The way out lives in `lib/ea.js`. It tries EA directly, walking through the
header variants. If all of them get a 403, it repeats the request one last time
through the public reader `r.jina.ai`, which leaves from an IP range EA accepts
and returns the body untouched. On your own machine that detour is never used,
because the direct path works. On Vercel it kicks in and the site behaves the
same.

To turn the detour off, set `EA_LEITOR=0` in the environment variables.

If you ever want the reader out of the path, there is a Cloudflare Worker ready
in `worker/index.js` that plays the same role with caching at the edge:

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

Then point the site at it under **Settings → Environment Variables** on Vercel:

```env
EA_PROXY_URL=https://zurmely-ea-bridge.YOUR-SUBDOMAIN.workers.dev
```

Today this is optional and switched off: Cloudflare sits on the same EA block
list, so the Worker ends up taking the same reader detour. The desktop program
does not suffer from any of this, because it runs on your home IP.

---

## Why there is a server in the middle

The EA API (`proclubs.ea.com/api/fc/...`) sends no CORS headers and rejects
requests without an EA `Referer`. A purely static site calling the API straight
from the browser simply does not work.

So every access goes through `lib/ea.js`, which runs on the server. The club,
player and match pages are server components and call those functions directly;
the search, which happens as you type, goes through `/api/ea/search`.

Each response is cached for 60 seconds, which keeps navigation quick and avoids
hitting EA on every click.

---

## What EA publishes, and what it does not

Worth knowing so you do not expect what is not there:

- **No possession.** The match comparison shows the volume of passes attempted,
  under that name, which is the closest thing to it.
- **No team stats per match.** Both sides are added up line by line from the
  players.
- **No full history.** Only the latest league and playoff matches. That is why
  the head to head against an opponent sometimes does not show up.
- **No match by id endpoint.** The match page fetches both lists and looks
  inside them.
- **Career comes without percentages.** Passing, tackling, finishing and wins
  only exist in the season view, which is why the tables swap columns along with
  the mode instead of showing fake zeros.
- **The squad only carries players with games on record.** A club with six
  players in the API is normal, not a bug.

---

## Demo mode

The EA API goes down now and then (whole days, sometimes). To keep working on
the layout anyway, put this in `.env.local`:

```env
EA_DEMO=1
```

The site switches to the made up data in `lib/demo.js` and shows a yellow notice
at the top of the club page, so nobody mistakes it for real data. Set
`EA_DEMO=0` when you are done. Be careful not to build the desktop program with
this switched on: the fake data ends up inside the executable.

---

## Structure

```
app/
  page.jsx                            home: search + my club card
  clube/[platform]/[id]/              club page
    jogador/[nome]/                   athlete DNA
    partida/[matchId]/                match analysis
  comparar/                           club comparison
  sobre/                              frequently asked questions
  api/ea/search/                      search (used by the search field)
  api/ea/club/                        full dossier (used by the comparison)
  api/ea/meu-clube/                   short summary for the home card
  api/ea/diag/                        diagnostics for the EA block
  globals.css                         the whole theme, in CSS variables
components/
  SearchBar.jsx                       search with debounce and keyboard
  ClubHeader.jsx                      header with crest and kit colours
  StatCards.jsx                       cards, recent form and highlights
  BestEleven.jsx                      the best eleven pitch
  Leaderboards.jsx                    squad rankings in seven tabs
  PlayersTable.jsx                    squad table, sortable and filterable
  DnaAtleta.jsx                       player page
  RadarDNA.jsx                        six axis radar, in SVG
  GraficoNotas.jsx                    rating match by match, in SVG
  ComparativoPartida.jsx              side by side bars for both teams
  ElencosPartida.jsx                  both lineups of a match
  MatchList.jsx                       recent matches
  MeuClube.jsx                        my club card on the home page
  DefinirMeuClube.jsx                 button to mark the club
  LanguageSwitch.jsx                  PT / EN switch
  I18nProvider.jsx                    carries the language to client components
  Crest.jsx                           crest drawn with the kit colours
  Compare.jsx                         comparison screen
lib/
  ea.js                               EA API client
  dossier.js                          joins info + stats + squad + matches
  escalacao.js                        picks the eleven and builds the pitch
  dna.js                              radar axes, medals and archetype
  partida.js                          totals, comparison and the game reading
  meuClube.js                         my club, stored in the browser
  format.js                           formatting (divisions, positions, colours)
  config.js                           site name, pinned club, platforms
  demo.js                             made up data for demo mode
  i18n/
    pt.js  en.js                      the two dictionaries, key for key
    dictionaries.js                   registry, safe on server and client
    server.js                         reads the cookie and Accept-Language
desktop/
  main.js                             Electron shell of the Windows program
  PACKAGING.md                        the executable recipe
worker/
  index.js                            optional Cloudflare Worker bridge
```

Note on naming: files and identifiers are still in Portuguese, and that is on
purpose. They are the project own vocabulary, renaming them would touch every
import for no user visible gain, and the risk is not worth it. Comments,
documentation and commits are in English.

---

## Changing the look

Almost everything sits in variables at the top of `app/globals.css`:

```css
--brand-blue: #2b7fff;  /* the "Zurmely" */
--brand-red:  #ff3b4e;  /* the "Tracker" */
--accent:     #2b7fff;  /* main interface colour */
--rival:      #d2762d;  /* the opponent in the match comparison */
--bg:         #07080b;  /* background */
```

The `--accent` and `--rival` pair was chosen by running it through a palette
validator: lightness band, chroma, contrast against the panel and separation
under colour blindness. If you swap those two, it is worth checking they stay
distinguishable.

The name and tagline come from `NEXT_PUBLIC_SITE_NAME` and
`NEXT_PUBLIC_SITE_TAGLINE`. Leave the tagline empty and it follows the language.

---

## Common problems

**"The EA API did not answer"**
It may be instability on the EA side, or an IP block. Open `/api/ea/diag` on the
published site: it hits EA with three header sets, also tests the reader detour
and shows the status of each attempt. Three 403 answers within a few
milliseconds means a network block, and the way out is the detour described
above. A connection error or a timeout means EA itself is down.

**The club does not show up in search**
EA search is picky about spelling. Type the name exactly as it appears in the
game, spaces and symbols included, and try switching the platform in the
selector.

**The crests are just initials**
On purpose. EA publishes no reachable address for custom crests: the patterns
the community used are all down. Instead of trying images that never load,
`Crest.jsx` draws a monogram with the real kit colours, which the API does hand
over. If a working URL ever turns up, it is just a matter of rendering an
`<img>` again and keeping the drawing as the fallback.

**Few matches in the history**
EA only exposes the most recent league and playoff matches. There is no full
history on the public API.

**The player does not show up on the DNA page**
EA only returns players with games on record. Anyone who left or has not played
yet does not appear, and the page says so instead of showing an empty profile.

---

## Disclaimer

A fan project, with no affiliation, sponsorship or approval from Electronic
Arts. EA, EA SPORTS and EA FC are trademarks of Electronic Arts Inc. The data
comes from public, unofficial endpoints that EA can change or shut down at any
time.
