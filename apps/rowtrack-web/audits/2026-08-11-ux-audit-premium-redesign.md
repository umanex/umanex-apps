# UX-audit — rowtrack-web premium redesign

- **Geaudit:** onepager `/nl` na de premium redesign-laag (branch `feature/rowtrack-web-premium-redesign`)
- **Datum:** 2026-08-11
- **Platform:** web, responsive (desktop 1280px + mobiel 375px gemeten)
- **Methodiek:** IxDF-framework — 7 UX-factoren (Morville), 5 usability-karakteristieken (ISO 9241-11), 5 interactie-dimensies (Crampton Smith & Silver)
- **Bewijs:** full-page renders desktop + mobiel op de verse build (scroll-doorloop, eindstaat), WCAG-contrastmetingen (berekend), state-checks no-JS / reduced-motion / tegenproef, flow-harness (routes, console, origin-lek, klik-navigatie)

## Samenvatting

**Score: 71/85 (≈ 84/100) — grade B, solide met kleine verbeteringen.**

De redesign-laag tilt de site zichtbaar boven het vlakke vertrekpunt: gelaagde donkere canvas (raster + accentgloed), grotere serif display-typografie met eyebrow-accentlijnen, gradient-hairline-kaarten voor records en het uitgelichte prijsplan, en een one-shot scroll-motion-laag die zonder JavaScript en onder reduced motion volledig wegvalt in plaats van content te verbergen. De inhoudelijke ruggengraat (waarheidstabel, één CTA, geen afleidende navigatie) is onaangeraakt. Er zijn **geen P0- of P1-bevindingen**; de restpunten zijn poets-niveau en staan in `apps/rowtrack-web/BACKLOG.md`.

Top-3 aandachtspunten (allemaal P2/P3):
1. De metrics-grid (7 kaarten in 4 kolommen) laat rechtsonder een leeg slot — bewust asymmetrisch, maar het oog zoekt er iets.
2. De hero-kop breekt op 1280px na "telt." — grammaticaal logisch, maar de slogan "Elke haal telt." wint kracht als hij op één regel staat.
3. De maker-sectie mist nog de foto (bekende TODO(assets), buiten scope van deze redesign).

## 7 UX-factoren

| Factor | Score | Onderbouwing |
|---|---|---|
| Useful | 4 | Lost de echte vraag op ("werkt dit met mijn Apollo XL?") vóór alles; S2 direct na de hero. |
| Usable | 4 | Eén kolom, één CTA drie keer herhaald, geen navigatie die afleidt; klik-navigatie door de harness aangedreven. |
| Findable | 4 | Onepager zonder sectienav is hier een bewuste keuze (briefing); footer draagt de verplichte pagina's. |
| Credible | 5 | Elke claim uit de waarheidstabel; niet-affiliatie-disclaimer dubbel; echte app-screenshots, geen mockups; privacy-sectie zegt eerlijk wat er wél naar Supabase gaat. |
| Desirable | 4 | Premium-laag staat: gelaagde achtergronden, serif display, achievement-discipline (alleen S6), motion met maat. Foto en App Store-badge ontbreken nog (wacht-staten). |
| Accessible | 4 | Alle gemeten paren ≥ 4.5:1 (laagste: FAQ-hover 4.90:1); reduced-motion → directe eindstaat (gemeten); no-JS → alles zichtbaar (gemeten); focus-ring op accordion; semantiek ongewijzigd (één h1, h2 per sectie). Geen volledige WCAG-audit of schermlezer-doorloop gedaan. |
| Valuable | 4 | Conversiegericht naar App Store; pending-staat is eerlijk zolang de app er niet staat. |

**Subtotaal: 29/35**

## 5 usability-karakteristieken

| Karakteristiek | Score | Onderbouwing |
|---|---|---|
| Effectiveness | 4 | Bezoeker kan het enige doel (begrijpen + willen downloaden) zonder obstakels bereiken. |
| Efficiency | 4 | Statisch SSG, first load ~87 kB gedeeld; hero-beeld met `priority`; motion compositor-only. |
| Engagement | 4 | Reveal/stagger/shine geven ritme zonder te vertragen; doorlopende beweging beperkt tot de hero-float en de twee pulserende statusstippen, alle drie alleen bij `no-preference`. |
| Error tolerance | 4 | Er valt weinig fout te doen (geen formulieren); onbekende locale → 404; externe origins geblokkeerd in de harness bewijzen geen stille afhankelijkheden. |
| Ease of learning | 5 | Standaard marketingpatronen, niets te leren. |

Utility-check: de juiste features zijn aanwezig voor een pre-launch marketingsite; het enige "ontbrekende" (echte badge, foto, detail-screenshot) is bekend en gepland, geen gat in het ontwerp.

**Subtotaal: 21/25**

## 5 interactie-dimensies

| Dimensie | Score | Kernobservaties |
|---|---|---|
| Words | 5 | Copy uit `messages/nl.json`, SI-casing consequent, geen buzzwords; eyebrows als korte vragen/labels werken. |
| Visual representations | 4 | Hiërarchie sterk (eyebrow → h2 → body); eenheid-als-groot-element in metric-kaarten leest als app-DNA; achievement alleen in S6 houdt betekenis. |
| Physical / space | 4 | 375px: één kolom, geen horizontale overflow (gemeten 0px); FAQ-rijen ± 68px hoog, pending-badge 56px — ruim boven 44px touch-minimum. |
| Time | 4 | Reveals 0.6–0.8s one-shot met korte stagger; niets blokkeert lezen; reduced-motion volledig gerespecteerd; print-vangnet aanwezig. |
| Behavior | 4 | Hover-lift + accentrand op kaarten, focus-visible op accordion, observer koppelt af na onthulling (terugscrollen verspringt niet). |

**Subtotaal: 21/25**

## Bevindingen (geprioriteerd)

Geen P0. Geen P1.

| P | Bevinding | Impact | Effort | Aanbeveling |
|---|---|---|---|---|
| P2 | Metrics-grid: 7 kaarten in 4 kolommen laat een leeg slot rechtsonder | Laag — oogt als "er mist er één" | S | Laatste kaart laten spannen, of 3-koloms grid terug (3+3+1 gecentreerd), of een achtste niet-verzonnen element (bewust niet gedaan — geen claim buiten de waarheidstabel) |
| P3 | Hero-kop breekt na "telt." op 1280px; de slogan wint kracht op één regel | Zeer laag | S | `max-w`-tuning of een `<br>`-vrije balans-hint zodra de EN-locale er is (kopwijziging raakt copy) |
| P3 | Maker-sectie zonder foto — de sectie leunt nu volledig op typografie | Laag | — | Bestaande TODO(assets); foto aanleveren, geen stock |

De P3's staan als `ux`-entries in `apps/rowtrack-web/BACKLOG.md` — een P3 die alleen hier staat, verdwijnt met dit rapport.

## Redesign-voorstellen

Niet van toepassing op dit niveau: er zijn geen bevindingen die een structurele herontwerp-richting vragen. De P2 (metrics-slot) is een layout-keuze binnen de bestaande compositie; de twee opties staan in de tabel.

## Research-aanbevelingen

1. **5-seconden-test op de hero** bij 3–5 Apollo XL-bezitters: begrijpen ze zonder scrollen wat de app doet en voor welke machine?
2. **Scroll-depth** meten zodra de cookieloze analytics er is (open vraag 2 uit de basisbriefing): haalt de bezoeker S8 (prijzen)?
3. **Toetsenbord/schermlezer-doorloop** (VoiceOver + Safari) vóór livegang — de code-signalen staan goed, maar dat is geen runtime-bewijs.

## Methodiek & limieten

Expert-review, geen gebruikersonderzoek; scores zijn onderbouwde inschattingen, geen gemeten gedrag. Gemeten is: contrast (berekend uit de token-waarden), no-JS/reduced-motion-gedrag (Playwright, met tegenproef), responsive overflow (375px), routes/console/origins (flow-harness). Niet gemeten: echte laadtijd op een traag toestel, schermlezer-ervaring, conversie. Persona-aanname: de primaire bezoeker is de Apollo XL-bezitter uit de basisbriefing die via zoekverkeer of de app-store-listing binnenkomt.
