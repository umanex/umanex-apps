# RowTrack marketingsite — premium redesign (rowtrack-web)

- **Datum:** 2026-08-11
- **Type:** feature
- **Project:** apps/rowtrack-web
- **Klant:** umanex (eigen product)
- **Status:** gepland

---

```
TASK:        Herontwerp de rowtrack-web onepager en subpagina's naar een premium,
             dynamisch niveau — zelfde inhoud, zelfde functionaliteit, nieuwe visuele
             laag en motion. Voorstel op branch feature/rowtrack-web-premium-redesign.

CONTEXT:     De site staat er functioneel (S1-S11 + privacy/voorwaarden/support) maar
             visueel vlak: één max-w-5xl kolom, uniform py-24 ritme, geen motion, 0 JS.
             De scroll-onthullingen uit de briefing van 2026-08-09 zijn nooit gebouwd.
             Redesign = laag bovenop de bestaande fundering; copy, routes, SEO en de
             waarheidstabel (briefing 2026-08-09) blijven bindend en ongewijzigd.

ELEMENTS:    Zelfde sectiecomponenten S1-S11 + Footer, Section, SectionHeading,
             MetricCard, PricingCard, FaqAccordion, ScreenshotFrame, AppStoreBadge.
             Nieuw (design-laag): Reveal (IntersectionObserver client-component),
             CountUp, sectie-eyebrows, gradient/glow-achtergrondlagen uit token-rollen,
             card-treatments. Geen nieuwe pagina's, geen nieuwe copy-keys, geen nieuwe
             dependencies.

BEHAVIOUR:   Scroll-onthulling per sectie (fade+rise, stagger), count-up op metrics,
             shine op PR-kaarten (S6) — one-shot, compositor-only (transform/opacity).
             Hover: kaart-lift + accentrand; focus-visible ring overal. FAQ blijft
             native <details>, toetsenbord-bedienbaar. Zonder JS: alles direct
             zichtbaar (reveal-styles alleen achter een data-js gate op <html>). Bij
             prefers-reduced-motion: eindstaat, geen beweging.

CONSTRAINTS: Dark-only, RowTrack-DNA. Kleuren token-only (guard blijft groen); maten
             op Tailwind-schaal met TODO-markers zolang web-tokens ontbreken (geen
             precedent). Geen tekst op accent-achtergrond onder 18.66px bold — wit op
             accent meet 3.44:1 en haalt alleen large-text AA. Achievement-kleur enkel
             S6; accent enkel CTA/links/hover/actief. Geen nieuwe deps (geen
             framer-motion): CSS keyframes + één kleine client-component. Hero licht:
             geen extra render-blocking assets. Semantiek ongewijzigd: één h1, één h2
             per sectie, pagina volledig leesbaar zonder JavaScript.
```

---

## Open vragen

Geen — de vier kritische items zijn beantwoord door de bestaande site en de briefing
van 2026-08-09 (typologie, states, interactie en edge cases erven van wat er staat).

## Aannames

- `[ASSUMPTION: Redesign-richting is "instrumentenpaneel"-esthetiek — gelaagde donkere
  canvas met token-gradients/glows, grotere serif display-typografie, data-gedreven
  accenten — binnen de bestaande 33 token-rollen. Geen nieuwe tokens verzinnen.]`
- `[ASSUMPTION: App-screenshots blijven placeholders; het design moet ook daarmee
  premium ogen.]`
- `[ASSUMPTION: De scroll-motion uit de oorspronkelijke briefing (fade+rise, stagger,
  count-up, PR-shine) is gewenst gedrag en wordt nu effectief gebouwd.]`
- `[ASSUMPTION: Subpagina's krijgen alleen de nieuwe stijl-laag (typografie, ritme),
  geen structurele wijziging.]`
- `[ASSUMPTION: Geen states-uitbreiding — statische site zonder data-laag; de enige
  niet-default toestanden blijven reduced-motion en no-JS.]`

## Acceptatie

- [ ] Alle S1-S11 secties + subpagina's renderen met identieke copy-keys uit
      `messages/nl.json`; geen key toegevoegd, verwijderd of gewijzigd
- [ ] Routes, metadata, JSON-LD, robots en sitemap onaangeraakt (diff raakt
      `lib/schema.ts`, `lib/metadata.ts`, `app/robots.ts`, `app/sitemap.ts` niet)
- [ ] Eén `<h1>`, één `<h2>` per sectie — semantiek gelijk aan vóór het redesign
- [ ] `pnpm --filter @umanex/rowtrack-tokens guard` groen; geen hex of rauwe
      paletklasse in de diff
- [ ] `pnpm turbo type-check lint build --filter rowtrack-web` groen; flow-harness
      groen (0 console-fouten per route)
- [ ] Zonder JavaScript is elke sectie direct volledig zichtbaar (reveal-styles
      uitsluitend achter de data-js gate)
- [ ] Met `prefers-reduced-motion: reduce` toont elke sectie direct de eindstaat —
      vastgelegd met een emulatie-screenshot
- [ ] Geen tekst op accent-achtergrond onder 18.66px bold; elke nieuwe kleurcombinatie
      gemeten en genoteerd
- [ ] Achievement-kleur uitsluitend in S6; accent uitsluitend CTA/links/hover/actief
- [ ] Geen nieuwe dependency in `package.json`
- [ ] Render-screenshots per route vastgelegd (`flow --shot`) als voor/na-bewijs

## Beslissingsgeschiedenis

- 2026-08-11: Briefing aangemaakt als redesign-laag bovenop
  `2026-08-09-feature-rowtrack-web-marketingsite.tcebc.md`. Inhoud en functionaliteit
  bevroren; alleen de visuele laag en motion gaan omhoog.
