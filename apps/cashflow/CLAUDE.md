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

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-07 door het te draaien, niet door het
af te leiden. Staat er "geen", dan is dat een gat dat gebouwd moet worden — geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `pnpm --filter cashflow verify:visual` rendert de rollaag en de charts naar `.screens-preview.html` / `.charts-preview.html` en sweept ze op contrast. Let op de dekking: `MonthCard` en de modals staan **niet** in die harness — het grootste scherm van de app zit er niet in. Daarvoor: screenshot van de draaiende app op `http://localhost:3000`. |
| **Flow aandrijven** | Browser-automatisering tegen de PM2-server. Voor de dnd-kit-sleep volstaat `left_click_drag` **niet** — zie het recept hieronder. Het toetsenbordpad (spatie → pijltjes → spatie) drijft een tweede, onafhankelijke sensor aan en is dus het controle-pad. |
| **State forceren** | **Geen.** Geen testaccount, geen dev-route, geen mock-laag — de app toont altijd Jeroens echte Supabase-document, dus loading/empty/error zijn niet op te wekken. `scripts/seed-supabase.mjs` is géén verify-pad: dat is een one-off migratie die naar productie schrijft. |
| **Invariant draaien** | `./apps/cashflow/node_modules/.bin/tsx apps/cashflow/scripts/anchor-scenarios.ts` → `48/48 checks geslaagd` (gemeten 2026-08-07). Idem `buffer-scenarios.ts`. `calc-baseline.ts` dumpt een digest vóór en ná een refactor; een lege diff bewijst dat geen enkel getal verschoof. Alle drie pure berekening, geen netwerk. **Geen van drieën wordt door `package.json` of CI aangeroepen** — met de hand starten. |
| **Verse build** | PM2 draait een production build (`next start`), geen `next dev`: de browser ziet `.next`, niet je source. Toets met `find app components lib store -newer .next/BUILD_ID` — leeg betekent actueel. Na een wijziging `pnpm --filter cashflow pm2:rebuild`, daarna hard refresh. |

**`pm2 status` is geen bewijs dat de app draait.** Op 2026-08-07 stond cashflow op `online` terwijl er
niets op poort 3000 luisterde: PM2's opgeslagen procesdefinitie wees nog naar de root-binary
`node_modules/.bin/next`, die er onder pnpm's isolated layout niet meer is. Herkenbaar aan `pid N/A`
en `mem 0b` bij status `online`. Toets daarom de poort, niet de status —
`lsof -nP -iTCP:3000 -sTCP:LISTEN`, of `curl -s -o /dev/null -w '%{http_code}' localhost:3000`.
Herstellen is de definitie herladen, niet herstarten:
`pm2 delete cashflow && pnpm --filter cashflow pm2:start && pm2 save`. Zonder die `pm2 save` haalt een
`pm2 resurrect` de dode definitie terug.

### Recept — een dnd-kit sleep aandrijven zonder iets te schrijven

Gemeten 2026-08-07 op de draaiende app, tegen echte data, zonder één schrijfactie.

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

**Het tabblad moet zichtbaar zijn.** In een achtergrond-tabblad is `document.visibilityState`
`hidden` en vuurt `requestAnimationFrame` niet meer. Een wachtlus op `rAF` hangt dan tot de
tool-timeout, en de DragOverlay blijft na afloop in de DOM staan omdat zijn exit-animatie geen frames
krijgt. Gebruik `setTimeout` als wachtmechanisme, of breng het tabblad naar de voorgrond.

**Bewijs achteraf dat er niets geschreven is.** Vergelijk `document.body.innerText` met een baseline
van vóór de sleep, maar filter eerst de aria-live-regels weg — die veranderen wél. Sluitender: herlaad
de pagina (verse fetch uit Supabase) en vergelijk dan; op 2026-08-07 gaf dat 11095 = 11095 tekens,
byte-identiek.
