# RowTrack marketingsite — premium redesign (rowtrack-web)

- **Datum:** 2026-08-11
- **Type:** feature
- **Project:** apps/rowtrack-web
- **Klant:** umanex (eigen product)
- **Status:** gevalideerd (iteratie 3 — designfeedback Jeroen verwerkt; guard, builds, harness, state- en hover-checks opnieuw groen)

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
             Nieuw (design-laag): Reveal (server-marker) + één gedeeld inline
             observer-script in layout, sectie-eyebrows met accentlijn, gradient/
             glow-achtergrondlagen uit token-rollen, card-treatments. Subpagina's:
             alleen de typografische stijl-laag (kop-schaal, tracking). Geen nieuwe
             pagina's, geen nieuwe copy-keys, geen nieuwe dependencies.

BEHAVIOUR:   Scroll-onthulling per sectie (fade+rise, stagger via CSS-animation),
             shine op PR-kaarten (S6) — one-shot, compositor-only (transform/
             opacity), onafhankelijk van React-hydration. Hover: kaart-lift +
             accentrand; focus-visible ring overal; focus in een nog niet onthuld
             blok onthult het (focusin-vangnet). FAQ blijft native <details>,
             toetsenbord-bedienbaar. Zonder JS of zonder IntersectionObserver:
             alles direct zichtbaar (data-js gate). Bij prefers-reduced-motion en
             in print: eindstaat, geen beweging, geen verborgen begintoestand.

CONSTRAINTS: Dark-only, RowTrack-DNA. Kleuren token-only (guard blijft groen); maten
             op Tailwind-schaal met TODO-markers zolang web-tokens ontbreken (geen
             precedent). Geen tekst op accent-achtergrond onder 18.66px bold — wit op
             accent meet 3.44:1 en haalt alleen large-text AA. Achievement-kleur enkel
             S6. Accent: CTA/links/hover/actief plus de bestaande micro-signalen
             (eyebrow + regel, lijststreepjes, kaart- en callout-randen, statusstip);
             geen nieuwe accent-vlakken, nooit als tekstachtergrond. Geen nieuwe deps
             (geen framer-motion): CSS keyframes + inline observer-script. Hero licht:
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

- [x] Alle S1-S11 secties + subpagina's renderen met de copy-keys uit
      `messages/nl.json`; één sanctioneerde uitzondering op "geen nieuwe keys":
      het achtste metrics-item SLAGEN (designfeedback Jeroen 2026-08-11, binnen
      de waarheidstabel — FTMS-slagen, geformuleerd als totaal-na-afloop);
      harness rendert alle routes
- [x] Routes, metadata, JSON-LD, robots en sitemap onaangeraakt — geen van
      `lib/schema.ts`, `lib/metadata.ts`, `app/robots.ts`, `app/sitemap.ts` in de diff
- [x] Eén `<h1>`, één `<h2>` per sectie — SectionHeading/FinalCta dragen dezelfde
      elementen als vóór het redesign; hero blijft de enige h1
- [x] `pnpm --filter @umanex/rowtrack-tokens guard` groen (40 bestanden schoon);
      geen hex of rauwe paletklasse in de diff (grep op `#`-waarden: leeg)
- [x] `pnpm turbo type-check lint build --filter rowtrack-web` groen (5/5);
      flow-harness groen — 3 routes 200, klik-navigatie, console schoon, geen
      extern verzoek
- [x] Zonder JavaScript is elke sectie direct volledig zichtbaar — gemeten met
      Playwright (`javaScriptEnabled: false`): 24 reveal-blokken, 0 verborgen
- [x] Met `prefers-reduced-motion: reduce` toont elke sectie direct de eindstaat —
      gemeten zonder scroll: 0 verborgen; tegenproef bij normale load: 23/24
      verborgen vóór scroll, dus de meting onderscheidt echt
- [x] Geen tekst op accent-achtergrond geïntroduceerd (nergens, dus ook niet onder
      18.66px bold); nieuw kleurpaar FAQ-hover accent-op-accent-subtle gemeten:
      4.90:1, alle overige paren ≥ 4.5:1 — genoteerd in
      `audits/2026-08-11-ux-audit-premium-redesign.md`
- [x] Achievement-kleur uitsluitend in S6 (grep: alleen `Records.tsx` + de
      `.shine`/`.hairline-achievement`-definities in `globals.css`); accent-gebruik
      op pariteit met vóór het redesign (CTA, links, hover/actief, eyebrow, randen)
- [x] Geen nieuwe dependency — `package.json` staat niet in de diff
- [x] Render-screenshots per route vastgelegd (`flow --shot=.flow-shots`), met
      scroll-doorloop zodat de capture de onthulde eindstaat toont; mobiel 375px
      apart vastgelegd (0px horizontale overflow)

## Beslissingsgeschiedenis

- 2026-08-11: Briefing aangemaakt als redesign-laag bovenop
  `2026-08-09-feature-rowtrack-web-marketingsite.tcebc.md`. Inhoud en functionaliteit
  bevroren; alleen de visuele laag en motion gaan omhoog.
- 2026-08-11: **CountUp geschrapt uit ELEMENTS.** De pagina bevat geen numerieke
  statistieken om op te tellen — de metric-kaarten dragen eenheden, geen waarden, en
  een getal verzinnen zou de waarheidstabel schenden. De motion-laag is fade+rise,
  stagger, rule-draw en PR-shine geworden.
- 2026-08-11: **Flow-harness scrollt nu door vóór de screenshot.** De full-page
  capture rendert buiten de viewport zonder dat de IntersectionObserver ooit vuurt;
  zonder doorloop legde hij secties op opacity 0 vast. Zelfde bevinding leidde tot
  het print-gedrag in `globals.css`.
- 2026-08-11: **Iteratie 2 na code-review (15 bevindingen, geen enkele genegeerd).**
  Architectuurwijziging: de onthulling hangt niet meer aan React-hydration — Reveal
  is een server-marker, één inline observer-script doet het werk, en `data-js` wordt
  alleen gezet als IntersectionObserver bestaat (blanco-pagina-bij-gefaalde-chunk
  weg, LCP-regressie weg). Stagger werd een CSS-animation omdat de vorige
  transition-regels de hover-utilities permanent overschreven. Verder: line-height
  hersteld op alle display-koppen (Tailwinds text-5xl/6xl = lh 1), rotate en float
  op aparte wrappers, echte transparante borders als forced-colors-vangrail,
  privacy-stagger geschrapt (kader stond stil terwijl de rijen schoven),
  motion-gate `screen and` i.p.v. een apart print-blok, nth-child-catch-all,
  focusin-vangnet, `/nl/voorwaarden` in de harness-routes, deterministische
  screenshots (`animations: 'disabled'`), subpagina's kregen de beloofde
  typografische laag, en het accent-beleid staat nu expliciet in CONSTRAINTS in
  plaats van impliciet in een afvink-formulering.
- 2026-08-11: **Iteratie 3 — designfeedback van Jeroen op het gevalideerde voorstel.**
  (1) Lichte gradients door het geheel voor meer dynamiek: raised secties faden
  naar de basiskleur, kaarten krijgen een subtiele licht-sheen bovenaan. (2) De
  telefoonbeelden krijgen diepte via dropshadow + subtiele accentglow. (3) Het
  quoteblock-met-linkerrand-patroon (Compat-callout, Analysis-tabs) is verboden
  patroon — vervangen door een neutrale kaart resp. pill-stijl tab-labels die het
  app-UI spiegelen. (4) De live-metrics-grid gaat naar **acht** kaarten (4+4) voor
  visueel evenwicht; de achtste is SLAGEN — FTMS levert het slagen-totaal
  (waarheidstabel) en de samenvatting toont het; de kaart formuleert dat expliciet
  als totaal-na-afloop, geen valse live-claim. Dit voegt één copy-key toe aan
  `messages/nl.json` — bewuste afwijking van "geen nieuwe copy-keys", op vraag van
  Jeroen. Lost meteen het BACKLOG-item "Metrics-grid laat een leeg slot" op.
