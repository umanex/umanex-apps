# CLAUDE.md — cashflow app

## Server management

De cashflow app draait als production server (`next start --port 3000`), beheerd door **PM2** (app-naam `cashflow`, `autorestart: true`, config in `ecosystem.config.js`). Het is **geen** `next dev` — de browser ziet de vooraf-gebouwde `.next`, niet je live source.

### Harde regel: na elke code-wijziging build + PM2 restart

Een source-wijziging is pas zichtbaar op localhost na een nieuwe build én een PM2 restart:

```bash
pnpm --filter cashflow build && pm2 restart cashflow
```

Beide commando's staan in de allowlist van `.claude/settings.local.json`. Daarna in de browser een **hard refresh** (Cmd+Shift+R) — het open tabblad heeft de oude chunk-hashes nog gecached.

**Reden:** `next start` serveert chunks met content hashes. Na een rebuild zijn die hashes veranderd; een lopende server kent alleen de oude hashes en geeft `ChunkLoadError` in de browser. Hard refresh van het tabblad alleen volstaat niet — de server zelf moet de nieuwe build laden.

**Niet manueel killen.** PM2 `autorestart` respawnt het proces direct, en een handmatige `pnpm start &` ernaast geeft een tweede, conflicterende server op dezelfde poort. Gebruik altijd `pm2 restart cashflow`.

Logs: `pm2 logs cashflow` of `/Users/jeroen/.pm2/logs/cashflow-{out,error}.log`.

---

## Geen dark mode

Cashflow draait uitsluitend in light. Beslissing van Jeroen op 2026-08-08; de app is een
persoonlijke tool op één scherm en een tweede mode leverde alleen onderhoud op. Er is dus geen
theme-class, geen `ThemeToggle` en geen theme-init-script — bouw ze niet terug.

De gedeelde lagen blijven ongemoeid: `@umanex/tokens` houdt zijn `Theme/dark` en `Semantic/dark`
sets (portfolio, vyvey en jobradar gebruiken ze), `packages/ui` houdt zijn `ThemeToggle`, en
`darkMode` blijft in de gedeelde Tailwind-preset staan. Wat hier weg is, is de *aanroep* — de
`.dark`-blokken in `theme.css` worden in deze app nooit aangezet.

Gevolg voor verificatie: `render-screens.tsx` rendert één kolom en `dom-sweep.mjs` labelt geen
mode meer. Een contrastcijfer voor cashflow gaat dus altijd over light.

---

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-07 door alle vijf te draaien, niet door
ze af te leiden. Staat er "geen", dan is dat een gat dat gebouwd moet worden — geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `pnpm --filter cashflow verify:visual` rendert de rollaag en de charts naar `.screens-preview.html` / `.charts-preview.html` — statisch, geen server en geen sessie — en sweept ze meteen op contrast (284 tekstelementen, gemeten 2026-08-08). Alleen light; zie "Geen dark mode" hieronder. Let op de dekking: `MonthCard` en de modals staan **niet** in die harness. Het échte scherm zien: `pnpm --filter cashflow flow --headed`, of een screenshot van de draaiende app op `http://localhost:3000`. |
| **Flow aandrijven** | `pnpm --filter cashflow flow` — Playwright rijdt de sleep tussen twee maandkolommen uit, met toetsenbord én muis, tegen de gebouwde app. Start zijn eigen `next start` op **3100** en weigert te draaien als daar al iets luistert. `--selftest` voegt een scenario toe dat hóórt te falen, `--headed` laat meekijken, `--port=` wijkt uit. Vereist een build in `apps/cashflow/.next`; hij bouwt bewust niet zelf. Moet je juist de échte data zien, dan is er het handmatige recept onderaan — daar geldt de schrijf-discipline wél. |
| **State forceren** | De fixture in `scripts/flow-harness.mjs` (`fixtureData()`): één post met een uniek bedrag in de eerste van drie kolommen, geserveerd uit een onderschepte route. Loading, empty en error zijn daarmee nog **niet** op te wekken — de handler antwoordt altijd meteen en goed. **Geen testaccount:** er is één Supabase-gebruiker en dat is Jeroens echte data. `scripts/seed-supabase.mjs` is géén verify-pad — dat is een one-off migratie die naar productie schrijft. |
| **Invariant draaien** | `pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/buffer-scenarios.ts` → 546/546, en hetzelfde voor `scripts/anchor-scenarios.ts` → 48/48 (gemeten 2026-08-07). `calc-baseline.ts` dumpt een digest vóór en ná een refactor; een lege diff bewijst dat geen enkel getal verschoof. Alle drie pure berekening, geen netwerk. **Geen van drieën wordt door `package.json` of CI aangeroepen** — met de hand starten. Een harness die door niets aangeroepen wordt, meet niets. |
| **Verse build** | Twee doelwitten, houd ze uit elkaar. De PM2-app op **:3000** draait uit de hoofd-tree en serveert `.next`, niet je source: toets met `find app components lib store -newer .next/BUILD_ID` — leeg betekent actueel. Na een wijziging `pnpm --filter cashflow pm2:rebuild`, daarna hard refresh. De flow-harness bouwt en serveert in zijn éígen worktree op 3100 en raakt :3000 niet aan. |

**`pm2 status` is geen bewijs dat de app draait.** Op 2026-08-07 stond cashflow op `online` terwijl er
niets op poort 3000 luisterde: PM2's opgeslagen procesdefinitie wees nog naar de root-binary
`node_modules/.bin/next`, die er onder pnpm's isolated layout niet meer is. Herkenbaar aan `pid N/A`
en `mem 0b` bij status `online`. Toets daarom de poort, niet de status —
`lsof -nP -iTCP:3000 -sTCP:LISTEN`, of `curl -s -o /dev/null -w '%{http_code}' localhost:3000`.
Herstellen is de definitie herladen, niet herstarten:
`pm2 delete cashflow && pnpm --filter cashflow pm2:start && pm2 save`. Zonder die `pm2 save` haalt een
`pm2 resurrect` de dode definitie terug.

**Destructieve paden — de harness kan er niet bij.** Élk verzoek naar de Supabase-origin wordt
onderschept: wat de harness kent (login, document, snapshots, de wegschrijf-call) beantwoordt hij uit
de fixture, al het overige breekt hij af en telt hij als lek, en één lek laat de run vallen. Ook een
geslaagde verplaatsing schrijft dus niets weg — de PATCH die de app dan stuurt, verschijnt in de
teller "schrijfpogingen onderschept". Richt hem nooit op :3000: daar draait de app mét jouw echte
sessie en echte data. De poortcheck weigert dat al, maar de reden hoort hier te staan. Zie rail 5 in
de `verify`-skill.

### Recept — een dnd-kit sleep met de hand aandrijven zonder iets te schrijven

Voor het geval je de sleep op de échte data moet zien in plaats van op de fixture. Gemeten
2026-08-07 op de draaiende app, zonder één schrijfactie.

**Welke paden gegarandeerd niets schrijven.** Er is één `onDragEnd`, in `CashflowDndContext.tsx`; de
secties gebruiken enkel `useDraggable` en alleen `MonthCard` is droppable. Die handler schrijft
uitsluitend wanneer `sourceMonth !== targetMonthKey`. Dus: **Escape tijdens de sleep** (→
`handleDragCancel`, doet alleen `setActiveItem(null)`) en **loslaten binnen dezelfde maandkaart** (→
early return) zijn allebei bewijsbaar schrijfvrij. Loslaten boven een *andere* maand is dat niet —
doe dat nooit op dit account.

**Observeer de aria-live-narratie, niet de DragOverlay.** dnd-kit vertelt zijn eigen levenscyclus in
`[aria-live]`: *"Picked up draggable item …"* → *"… was moved over droppable area month-2026-09"* →
*"Dragging was cancelled"*. Dat is het betrouwbare signaal. De DragOverlay is dat níet: bij een sleep
die in één burst afloopt commit React hem nooit, dus een observer die op de overlay let meldt nul
terwijl de sleep wél is opgepakt.

**Het instrument.** `left_click_drag` levert wel degelijk pointer-events af (gemeten: 1 pointerdown,
3 pointermove, 1 pointerup) en dnd-kit pakt het item ook echt op. Wat ontbreekt is *tijd*: alles valt
in één burst, dnd-kit krijgt geen frame om de droppables op te meten, `over` blijft dus `null` en
`onDragEnd` returnt vroeg. Vandaar het beeld "opgepakt maar onverplaatsbaar". Drijf de sleep daarom
aan met losse `PointerEvent`s en een wachttijd per stap:

    pointerdown op [aria-roledescription="draggable"]
    → 8 × pointermove richting het doel, ~50 ms ertussen
    → keydown Escape          (nooit pointerup boven een andere maand)

Dezelfde reden zit in de harness ingebakken: `page.mouse.move(..., { steps })` in plaats van één
sprong, plus een korte beweging om de 8px-drempel van de `PointerSensor` te passeren.

**Het tabblad moet zichtbaar zijn.** In een achtergrond-tabblad is `document.visibilityState`
`hidden` en vuurt `requestAnimationFrame` niet meer. Een wachtlus op `rAF` hangt dan tot de
tool-timeout, en de DragOverlay blijft na afloop in de DOM staan omdat zijn exit-animatie geen frames
krijgt. Gebruik `setTimeout` als wachtmechanisme, of breng het tabblad naar de voorgrond.

**Bewijs achteraf dat er niets geschreven is.** Vergelijk `document.body.innerText` met een baseline
van vóór de sleep, maar filter eerst de aria-live-regels weg — die veranderen wél. Sluitender: herlaad
de pagina (verse fetch uit Supabase) en vergelijk dan; op 2026-08-07 gaf dat 11095 = 11095 tekens,
byte-identiek.
