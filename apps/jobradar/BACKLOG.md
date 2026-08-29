# BACKLOG.md — jobradar

Kleine, afgebakende items die geen eigen briefing verdienen maar wel ergens moeten staan.
Een P3 die alleen in een auditrapport staat, verdwijnt met dat rapport.

Format: `- [ ] {type}: {wat} — {waarom} ({bron})`

## Open

- [ ] `infra`: De KBO-spiegel is **3,6 GB** (`.data/kbo.db`, extract 466) en de schijf stond
      bij het aanmaken op 99% vol (15 GiB vrij). `activity` is met 34.498.093 rijen veruit de
      grootste tabel, en daarvan zijn er 17.384.045 van NACE-versie 2003 (2.233.543) en 2008
      (15.150.502) — versies die de universum-query niet gebruikt. Snoeien halveert die tabel
      ruwweg. **Geen automatische winst:** de 2008→2025-hercodering is niet één-op-één, dus wie
      2008 weggooit kan een oudere referentie niet meer terugvertalen. Beslissing nodig, geen
      opruimactie. Exacte winst vraagt een `VACUUM` om te meten.
      (gemeten bij de eerste bootstrap, 2026-08-29)
- [ ] `refactor`: `lib/sources/kbo.ts` is dode code geworden. De KBO-data komt sinds het
      prospects-tabblad binnen via `/api/prospects` en `lib/kbo/universum.ts`, niet via
      `LEAD_SOURCES` — en dat blijft zo, want een prospect is geen lead. De stub staat nog in
      `LEAD_SOURCES` en levert bij elke sync nul rijen mét een waarschuwing die nergens meer
      over gaat. Weghalen, of hem een echte rol geven (bijvoorbeeld: een prospect promoveren
      zodra er een vacature van dat ondernemingsnummer binnenkomt).
      (gemeten bij de bouw van het tabblad, 2026-08-29)

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

De vijf UX-items en de twee verificatie-items uit de ux-audit van 2026-08-11 zijn op
2026-08-27 afgehandeld: drie gebouwd, drie verworpen, één gebouwd als harness-uitbreiding.
Briefing: `briefings/2026-08-27-feature-jobradar-a11y-afronding.tcebc.md` aan de root.

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
