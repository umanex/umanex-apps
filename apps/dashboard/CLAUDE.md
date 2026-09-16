# CLAUDE.md — apps/dashboard

Lokaal dev-dashboard voor de monorepo. Next.js (App Router), draait permanent onder
**PM2** als production build op poort 3010, gebonden aan **127.0.0.1**. Toont per app
in `apps/` de status en start of stopt hem.

**Deze app deployt nooit.** Zijn API-routes voeren shell-commando's uit op de machine
waarop hij draait; er hoort dus geen `vercel.json`, geen Vercel-project en geen
publieke bind bij. De loopback-bind staat in het `dev`-script én in de PM2-args
(`--hostname 127.0.0.1`), en `lib/localOnly.ts` weigert elke request met een
niet-loopback Host-header — twee sluizen, want de eerste is één regel die iemand kan
wegnemen. Gemeten 2026-09-09 op de PM2-app: `lsof` toont `127.0.0.1:3010`, een `curl`
op het LAN-adres komt niet binnen, en met een vreemde `Host`-header is het 403.

## Draait onder PM2 — dus build + restart, geen `dev`

Het dashboard hoort er te zijn zonder dat je hem start, dus draait hij als PM2-app
`dashboard` (`autorestart: true`, `next start --hostname 127.0.0.1 --port 3010`) uit de
hoofdtree. De browser ziet dan de gebouwde `.next`, niet je live source — een
bronwijziging is pas zichtbaar na:

```bash
pnpm --filter dashboard pm2:rebuild     # next build && pm2 restart dashboard
```

Alleen op `main`. Op een feature branch zet dat ongemergde code klaar op :3010 —
dezelfde regel als bij cashflow.

**Opzet op een nieuwe machine** (één keer, en dit ís de autostart):

```bash
pnpm --filter dashboard build
pnpm --filter dashboard pm2:start
pm2 save
```

`pm2 save` schrijft `~/.pm2/dump.pm2`; de LaunchAgent `~/Library/LaunchAgents/pm2.jeroen.plist`
draait bij het inloggen `pm2 resurrect` over precies dat bestand. Gemeten in
`~/.pm2/pm2.log`: op 2026-08-30 kwam de daemon 3½ minuut na boot op (20:38:43, boot
20:35:15) met cashflow meteen online. Zonder die `pm2 save` staat de app niet in de
dump en komt hij na een reboot niet terug.

**Ontwikkelen doe je ernaast, op `:3011`.** `pnpm --filter dashboard dev` draait met
`NEXT_DIST_DIR=.next-dev` op een eigen poort, dus de PM2-app op :3010 blijft gewoon
staan — je hebt de stabiele versie en je wijziging tegelijk in beeld, en er is geen
rebuild nodig als je klaar bent.

Dat is niet cosmetisch: dev-mode schrijft zonder die variabele zijn build in dezelfde
`.next` die PM2 serveert, en dan faalt `next start` op *Could not find a production
build*. Tweezijdig gemeten op 2026-09-09 in een worktree, mét een productieserver
ernaast: **met** de split bleef `.next/BUILD_ID` staan (`AZiT_9PFj…`) en bleef die
server 200 geven; **zonder** de split was `BUILD_ID` na dezelfde dev-run weg en kwam
`next start` niet meer omhoog (geen listener). Dat is ook precies wat er die ochtend
met de echte PM2-app gebeurde — die ging op `errored`.

De vangrail is één regel in `next.config.mjs` (`distDir: process.env.NEXT_DIST_DIR ??
'.next'`): zonder de variabele blijft alles `.next`, dus `next start` en CI merken er
niets van.

**`pm2 status` is geen bewijs dat hij draait**, hier net zomin als bij cashflow. Toets
met `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3010/` → 200.

## Wat waar staat

Vijf lagen in `lib/`, elk bestand met zijn eigen docblock bovenaan; `ls apps/dashboard/lib` is de index.

**De app-lijst is statisch en niet afgeleid uit `apps/*`.** Modus, poort en
startcommando zijn oordelen: rowtrack heeft geen `dev`-script maar moet
`expo start --dev-client` draaien, en cashflow's `dev` claimt een poort die PM2 al
bezit. Een lijst die dat uit `package.json` afleidt, zou die twee stil verkeerd hebben.

## De cockpit — `/cockpit`, het lezende oppervlak ernaast

`/` bedient processen; `/cockpit` leest een gemeten stand over álle repo's. Vier routes:
de portfolio, een klant, een project, en de systeempagina. Hij meet zelf niets — dat doet
`umanex-os/scripts/stand.sh`, die JSON schrijft naar `.stand/<slug>/`.

| Laag | Bestand | Verantwoordelijkheid |
|---|---|---|
| Registry | `stand.local.json` | welke klanten, welke repo-paden — **gitignored** |
| Lezen | `lib/stand/lezen.ts` | JSON van schijf naar `Gelezen<T>`; kent geen pad uit een request |
| Regels | `lib/standRegels.mjs` | versheid, aggregaat-invariant, de drie cohorten — puur, dus testbaar zonder build |
| Poort | `lib/cockpitCheckRules.mjs` | mag dit `Check`-commando draaien; allowlist per pijplijnsegment |
| Views | `components/cockpit/**` | props in, JSX uit. **Nooit** fs, shell of de leeslaag — `purity` dwingt dat af |

**Twee grenzen die geen afspraak zijn maar een guard.**

`umanex/umanex-apps` staat **publiek** op GitHub (`gh repo view` → `"visibility":"PUBLIC"`).
Gemeten klantdata mag hier dus nooit in een getrackt bestand landen: `.stand/` en
`stand.local.json` staan in `.gitignore`, en die regels stonden er vóór de eerste
collect-run. Klantnámen staan al publiek — de root-`CLAUDE.md` noemt ze — hun
backlog-inhoud en metingen niet.

En de views blijven schoon omdat ze moeten kunnen verhuizen. Fase 1 van
`umanex-os/docs/de-stand.md` zet een klant-oppervlak neer dat op Vercel draait: geen shell,
geen `lsof`, geen pid-bestanden. Zolang "de views raken dat niet aan" een goed voornemen is,
is het waar tot de eerste keer dat iemand snel een getal nodig heeft.

**De Check-runner voert shell uit uit een markdownbestand.** Drie sluizen, in deze volgorde:
de loopback-guard als eerste regel van de route, dan de meting (de entry moet bestaan en een
commando dragen), dan de poort. De request noemt klant, bestand en datum — **nooit het
commando**. Zodra dat uit de request zou komen, is elke poort erachter cosmetisch.

## Wat het dashboard nooit doet

- **Een proces stoppen dat het niet zelf startte.** De stop-knop verschijnt alleen bij
  `owner === 'dashboard'` — een pid die dit dashboard in `.runtime/<app>.pid` schreef en
  die nog leeft. PM2 en een extern gestarte dev-server krijgen geen knop.
- **Een commando draaien dat uit de request komt.** De request noemt een app-id en een
  scriptnaam; wát er draait komt uit `appsConfig.ts` en de `package.json` van die app.
- **`.next` wissen onder een draaiende server.** `guards.ts` blokkeert elk script waarvan
  de tekst `rm -rf …​.next` bevat zolang PM2 die poort bezet — dat is cashflow's
  `dev`-script, dat de vloer weghaalt onder de PM2-productiebuild op :3000.
- **Bouwen op een feature branch onder PM2.** `next build` is geblokkeerd zolang PM2 die
  app serveert en HEAD niet op `main` staat: dat zou ongemergde code klaarzetten.

Beide guards leiden af uit de **tekst van het script** plus de gemeten PM2-staat. Ze
noemen geen app bij naam, zodat een tweede app onder PM2 er meteen door gedekt is.

## Design-systeem-bron

- **Preset:** `@umanex/config/tailwind/preset`
- **Componentbron:** `@umanex/ui`
- **Storybook:** `pnpm --filter @umanex/ui storybook` (:6006)

## Verify-pad

| Capability | Commando |
|---|---|
| **Verse build** | `pnpm --filter dashboard pm2:rebuild` — bouwt én herstart de PM2-app op :3010, en alleen op `main`. Draait de server nog op oudere bron? `cd apps/dashboard && find app components lib -newer .next/BUILD_ID` — leeg = actueel (tweezijdig gemeten 2026-09-09: na een `touch` op `lib/status.ts` noemt hij dat bestand, na de rebuild is hij weer leeg). Een kale `build` is veilig maar verandert niets aan wat PM2 serveert tot je herstart |
| **Types** | `pnpm --filter dashboard type-check` |
| **Lint + tokenregels** | `pnpm --filter dashboard lint` (`@umanex/config/eslint/tokens` zit in `.eslintrc.js`) |
| **Tokenguard** | `pnpm --filter @umanex/tokens guard` |
| **Design-systeem-declaratie** | `pnpm ds:guard` (tegenproef: `pnpm ds:guard:selftest`) |
| **Render vastleggen** | Twee doelwitten, houd ze uit elkaar. De PM2-app draait al op `http://127.0.0.1:3010` en serveert de gebouwde `.next` — je eigen wijziging zie je daar pas na `pm2:rebuild`. Je wijziging live: `pnpm --filter dashboard dev` → `http://127.0.0.1:3011` (eigen `.next-dev`, raakt :3010 niet). Dark mode via de ThemeToggle rechtsboven |
| **State forceren** | De vier kaartstaten hangen aan gemeten feiten, dus je forceert ze door het feit te maken: `gestopt` = niets op de poort · `draait` = start vanuit het dashboard · `extern` = `pnpm --filter <app> dev` in een eigen terminal · `mislukt` = zet tijdelijk een onzinnig `startCommand` in `appsConfig.ts` |
| **Guard tegenproeven** | Beide kanten van `blokkade()`: mét PM2 online moet cashflow's `dev` en `build` een reden teruggeven; met `pm2 stop cashflow` moeten ze `null` geven. Draai `pm2 start cashflow` daarna weer aan |
| **Loopback-weigering** | `curl -s -o /dev/null -w '%{http_code}' -H 'Host: 10.0.0.5:3010' http://127.0.0.1:3010/api/status` → verwacht `403`; zonder de Host-header `200` |
| **Flow aandrijven** | `pnpm --filter dashboard flow` — bouwt naar `.next-harness`, serveert op `:3110` en loopt de vier cockpit-routes af (18 beweringen). Raakt `:3010` en `:3011` niet. Draai eerst `cockpit:collect`: zonder meting toetst hij alleen lege schermen, en dat is geen groen — vandaar dat hij in dat geval met exit 2 stopt in plaats van door te gaan |
| **Invariant draaien** | in de flow-harness, blok 2 en 3: elk aggregaat op `/cockpit` is de som van de regels waar het naartoe linkt, en een gerenderd getal komt uit de meting (tweezijdig — een verzonnen getal hoort er *niet* te staan). De pure kant staat in `lib/standRegels.mjs` (`aggregaatKlopt`) |
| **Cockpit-purity** | `pnpm --filter dashboard purity` — geen enkele view onder `components/cockpit/` raakt een node-builtin, shell of de leeslaag. Tegenproef: `purity:selftest` (5 gevallen, waaronder een lege map → meting ongeldig) |
| **Check-poort** | `pnpm --filter dashboard test` draait naast de twee start/build-regels nu ook de 28 gevallen van `lib/cockpitCheckRules.mjs`. De poort gemeten over de échte checks (2026-09-15): **104 van 144** doorgelaten, 40 geweigerd met reden. Is dat ooit 144 van 144, dan is de poort geen poort meer |
| **Meting verversen** | `pnpm --filter dashboard cockpit:collect [slug]` — draait `umanex-os/scripts/stand.sh` per klant uit `stand.local.json` naar `.stand/<slug>/`. Faalt luid als die tree op een branch zonder de collector staat |

**Let op bij verifiëren:** `pm2 stop cashflow` legt de draaiende productieserver op :3000
plat. Doe dat alleen bewust en zet hem daarna terug aan — of toets de guard op de
andere kant door de PM2-staat te lezen in plaats van te veranderen.
