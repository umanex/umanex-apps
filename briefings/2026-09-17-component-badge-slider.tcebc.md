# TC-EBC — Badge-maat en Slider-thumbnaam in @umanex/ui

- **Datum:** 2026-09-17
- **Type:** component
- **Project:** packages/ui (consument: jobradar)
- **Klant:** umanex
- **Status:** gepland

---

```
TASK:        Geef Badge een compacte maat als echte variant en de Slider-thumb een toegankelijke naam,
             zodat apps die niet langer lokaal hoeven na te bootsen.
CONTEXT:     Plan delightful-stirring-blossom, fase 4a. jobradar overschrijft Badge tientallen keren
             met `text-2xs`; de thumb van Min. score is het enige naamloze bedieningselement dat de
             naam-as van de jobradar-harness nog toelaat (fase 3). Twee root-BACKLOG-items raken
             hetzelfde bestand: badge.tsx-focusklassen (2026-08-27) en "Compacte maat" (2026-09-07).
ELEMENTS:    badge.tsx — cva-as `size` (default | sm), `whitespace-nowrap` in de basis, focusklassen
             via `focusRing` · slider.tsx — prop `thumbLabel` → `aria-label` op de Thumb · stories voor
             beide · Figma: size-as als variant op de Badge-component (Desktop Bridge) · jobradar —
             Min. score krijgt een thumbnaam, de naam-as verliest zijn uitzondering.
BEHAVIOUR:   `size="sm"` rendert de compacte badge zonder className-override; default blijft pixel-gelijk
             aan vandaag · een badge breekt nooit over twee regels · een focusbare badge toont alleen bij
             toetsenbordfocus een ring · de thumb heeft een berekende naam die de schermlezer voorleest.
CONSTRAINTS: Alleen rol- en schaal-utilities uit de preset, geen arbitrary values · default-varianten
             ongewijzigd voor bestaande consumenten (cashflow, dashboard, jobradar, stories) · Figma volgt
             de keten in packages/ui/CLAUDE.md, via Desktop Bridge, nooit native · alleen in een venster
             tussen twee bibliotheekbatches (anders botst figma/manifest.json) · consumenten omzetten naar
             `size="sm"` is fase 4b, niet hier.
```

---

## Open vragen

_(geen — de keuze "mét Figma-stap" is gemaakt bij het plan; wat nog onbekend is, wordt hieronder gemeten)_

## Aannames

- [ASSUMPTION: `sm` = de maat die jobradar vandaag met `text-2xs` overschrijft; de exacte padding wordt gemeten op
  een bestaande override, niet gekozen.]
- [ASSUMPTION: `thumbLabel` is optioneel — een Slider zonder label blijft renderen zoals nu; de naam-as van de
  harness vangt consumenten die hem vergeten.]
- [ASSUMPTION: de focusklassen van de Badge gaan naar `focusRing` (focus-visible), niet weg: jobradar gebruikt
  `badgeVariants` sinds fase 3 op een focusbare knop.]

## Acceptatie

_(wordt aangevuld na de verkenning: venster, de huidige Figma-keten en de gemeten sm-maat)_

## Beslissingsgeschiedenis

- 2026-09-17: aangemaakt vanuit plan fase 4a, op "Doe 4a" van Jeroen.
- 2026-09-17: venster dicht — PR umanex-apps#524 (layout-tokens, andere sessie) wijzigt figma/manifest.json,
  figma-sync-check.mjs, de preset en 11 componenten. Keuze Jeroen: wachten tot #524 gemerged is; de sm-maat van
  de Badge komt dan op de nieuwe spacing-rollen.
