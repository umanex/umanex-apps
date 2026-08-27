# BACKLOG.md — jobradar

Kleine, afgebakende items die geen eigen briefing verdienen maar wel ergens moeten staan.
Een P3 die alleen in een auditrapport staat, verdwijnt met dat rapport.

Format: `- [ ] {type}: {wat} — {waarom} ({bron})`

## UX

- [ ] `ux`: Contrast van de `|`-scheiding in `CoverageBar.tsx` — `text-border` meet 1.24 tegen
      een drempel van 4.5; visueel vrijwel onzichtbaar, waardoor de scheiding niets doet.
      Overweeg `text-muted-foreground` of hem vervangen door witruimte.
      (ux-audit 2026-08-11, P3)
- [ ] `ux`: Kopstructuur springt van h1 naar h3 — 1× h1, 327× h3, geen h2. De koppen-outline van
      een schermlezer is daarmee 327 items lang en draagt geen structuur. Overweeg een h2 per
      tabblad en de kaarttitels als niet-kop of h3 onder die h2.
      (ux-audit 2026-08-11, P3)
- [ ] `ux`: Focus is inconsistent — knoppen uit `@umanex/ui` dragen `focus-visible:ring-2`, de
      links in app-code (`Instellingen`, `Bekijk`, `Terug naar het dashboard`) vallen terug op
      de browserstandaard. Zichtbaar, maar twee verschillende vormen.
      (ux-audit 2026-08-11, P3)
- [ ] `ux`: Signaalbadges dragen geen gewicht — alle vier `variant="outline"`, terwijl
      `dev-vacature zonder design` 30 punten weegt en `recente groei` 20. Het zwaarste signaal
      is visueel niet te onderscheiden van het lichtste.
      (ux-audit 2026-08-11, P3)
- [ ] `ux`: "Min. score" is ambigu tussen de tabbladen — filtert op de vacaturescore bij
      Vacatures en op de leadscore bij Leads. Twee schalen, één label.
      (ux-audit 2026-08-11, P3)

## Verificatie

- [ ] `test`: Flow-harness op meerdere viewportbreedtes laten renderen — responsive gedrag is nu
      nergens geverifieerd, en met de huidige browserautomatisering ook niet te meten (het
      venster verkleinen liet `innerWidth` op 1417 staan).
      (ux-audit 2026-08-11, limiet)
- [ ] `test`: Toetsenbordvolgorde en focusvolgorde ongemeten — Tab bereikte de pagina niet via
      de automatisering. Vraagt een handmatige doorloop of een andere harness.
      (ux-audit 2026-08-11, limiet)

## Prospect-tak

- [ ] `refactor`: `haalPersoneel` bouwt de accountingData-URL zelf, terwijl elke Reference een
      `AccountingDataURL` meedraagt (staat in de API-definitie, gemeten 2026-08-26). De
      meegeleverde URL volgen is robuuster tegen een padwijziging aan NBB-kant. Niet gedaan
      omdat er nog geen echte respons is om tegen te toetsen — doen samen met de eerste
      geslaagde `scripts/nbb-probe.ts`-run.
      (nbb-probe 2026-08-26)
- [ ] `feature`: NACE-code als voorsortering in de labelwachtrij. 62200 ("computerconsultancy en
      beheer van computerfaciliteiten") is 8.544 van de 15.725 kandidaten en is per definitie de
      dienstverlener-kant; 62100, 58210/58290, 63910 en 63100 zijn de product-kant. Als *filter*
      niet doen — de code is zelfgerapporteerd, dus een producthuis dat 62200 aankruiste zou stil
      wegvallen. Als *sortering* zet het de waarschijnlijke prospects vooraan, naast de bestaande
      "met website eerst".
      (kbo-uitsplitsing 2026-08-26)
