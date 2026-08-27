# BACKLOG.md — jobradar

Kleine, afgebakende items die geen eigen briefing verdienen maar wel ergens moeten staan.
Een P3 die alleen in een auditrapport staat, verdwijnt met dat rapport.

Format: `- [ ] {type}: {wat} — {waarom} ({bron})`

## Open

_Leeg._ De vijf UX-items en de twee verificatie-items uit de ux-audit van 2026-08-11 zijn op
2026-08-27 afgehandeld: drie gebouwd, drie verworpen, één gebouwd als harness-uitbreiding.
Zie `briefings/…` aan de root: `2026-08-27-feature-jobradar-a11y-afronding.tcebc.md`.

## Verworpen

Met reden, want zonder reden komt hetzelfde voorstel over drie maanden terug en begint de
afweging van nul.

- `ux`: Signaalbadges gewicht geven — alle vier `variant="outline"` terwijl
  `dev-vacature zonder design` 30 punten weegt en `recente groei` 20.
  **Verworpen 2026-08-27** (Jeroen): niet doen. De leadscore-pil op dezelfde kaart draagt het
  gewicht al als getal; de badges zijn een opsomming van wat meetelde, geen rangschikking.
  (ux-audit 2026-08-11, P3)
- `ux`: "Min. score" ondubbelzinnig maken — het filtert op de vacaturescore bij Vacatures en op
  de leadscore bij Leads: twee schalen, één label.
  **Verworpen 2026-08-27** (Jeroen): niet doen. De app heeft één gebruiker, die beide assen kent;
  het label per tabblad laten verspringen kost meer dan het oplevert.
  (ux-audit 2026-08-11, P3)
- `test`: Flow-harness op meerdere viewportbreedtes laten renderen.
  **Verworpen 2026-08-27** (Jeroen): mobiel is voor jobradar geen doelwit. De app is een
  desktop-triagescherm; responsive gedrag hoeft niet geverifieerd te worden zolang dat zo blijft.
  Kantelt dat, dan is dit item de plek om te heropenen — Playwright kan de viewport wél zetten,
  dus de limiet uit de audit (het venster verkleinen liet `innerWidth` op 1417 staan) gold de
  browserautomatisering van toen, niet de harness van nu.
  (ux-audit 2026-08-11, limiet)

## Gebouwd

- `ux`: Contrast van de `|`-scheiding in `CoverageBar.tsx` — `text-border` mat 1.24:1.
  **Gebouwd 2026-08-27:** `text-muted-foreground`, gemeten 4.97:1 in light en 7.32:1 in dark op
  de gerenderde DOM.
- `ux`: Kopstructuur sprong van h1 naar h3 — 1× h1, 327× h3, geen h2.
  **Gebouwd 2026-08-27:** een `sr-only` h2 per tabpaneel. Gemeten: `/` heeft 336 koppen,
  h1 → h2 → h3, nul overgeslagen niveaus. De harness bewaakt het nu per run.
- `ux`: Focus was inconsistent — drie vormen naast elkaar, en drie elementen met `outline-none`
  zonder vervanging (status-select, chip-invoer, status-select per kaart) waren zelfs
  focus-loos. **Gebouwd 2026-08-27:** één `focusRing`-constante in `@umanex/ui/lib/focus`,
  overal geconsumeerd. Gemeten: 96 tab-stops over twee routes, elk met zichtbare focus.
- `test`: Toetsenbordvolgorde en focusvolgorde ongemeten.
  **Gebouwd 2026-08-27:** een toetsenbord-pass in de flow-harness die de echte tab-volgorde
  afloopt en per stop differentieel meet of de focus zichtbaar is, met een tegenproef in
  `--selftest`. Dat is de "andere harness" uit dit item — Playwright krijgt `Tab` wél in de
  pagina.
