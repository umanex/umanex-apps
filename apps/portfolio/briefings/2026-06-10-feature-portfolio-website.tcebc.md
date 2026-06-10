# TC-EBC — Portfolio website (umanex.be redesign)

- **Datum:** 2026-06-10
- **Type:** feature
- **Project:** portfolio (nieuwe app onder umanex-apps)
- **Klant:** umanex (eigen werk)
- **Status:** bouwklaar — kritische items beantwoord op 2026-06-10

---

```
TASK:        Nieuwe umanex.be portfolio site die de "Design Team Of One + AI" positionering centraal zet, ter vervanging van de huidige Framer-site.
CONTEXT:     Volgt uit UX-audit 2026-06-10 (grade D): AI-verhaal ontbreekt, geen cases, geen dogfooding van eigen stack. Nieuwe app in umanex-apps monorepo; de site moet zelf het bewijsstuk zijn van de AI-native werkwijze. Doelgroep: B2B software teams (primair), freelancers/kleine bedrijven (secundair).
ELEMENTS:    Navigatie, hero met herpositionering, probleemstelling-sectie (behouden van huidige site), AI-werkwijze-sectie, services (3 bestaande diensten), cases-overzicht + case-detail, werkwijze/samenwerken-sectie, contact-sectie, footer (BTW, adres, LinkedIn), light/dark mode toggle.
BEHAVIOUR:   Scroll-gedreven lezen; multi-page navigatie (home, cases + detail, werkwijze); contact via boekingslink + mailto + tel; theme toggle persistent.
CONSTRAINTS: Next.js 14 App Router, TypeScript strict, Tailwind, ShadCN-stijl (minimaal, neutraal), packages/tokens als enige styling-bron (geen hardcoded values), mobile-first, toegankelijkheid als basisprincipe (alt-teksten, keyboard, semantische HTML), NL, Vercel hosting (production deploy manueel door Jeroen).
```

---

## Beantwoorde kritische items (2026-06-10)

1. **Component-typologie (site-structuur):** multi-page — home + cases (overzicht + detail) + werkwijze.
2. **States:** theme light/dark (persistent); geen formulier-states (contact via externe boekingslink + mailto/tel); geen empty state voor cases nodig (2–3 cases bij launch).
3. **Interactie-modaliteit:** klik + scroll + keyboard (standaard web). [ASSUMPTION: geen rijkere interacties bij launch]
4. **Edge cases:** 2–3 cases bij launch; case-content variabele lengte; OG-image per pagina.
5. **App-naam:** `apps/portfolio`.

## Open vragen

1. **Case-selectie:** welke 2–3 cases — RowTrack + welk (geanonimiseerd) klantwerk? Content moet door Jeroen aangeleverd/gevalideerd worden.
2. **Boekingslink:** Cal.com of Calendly, en welke URL?

## Aannames

- [ASSUMPTION: umanex-DNA — gedeelde umanex tokens.json + Figma library, niet project-eigen DNA]
- [ASSUMPTION: Lucide als iconset — "web werk: typisch Lucide" uit profiel]
- [ASSUMPTION: NL-only bij launch; EN-versie is P3 uit de audit, latere iteratie]
- [ASSUMPTION: bestaande copy (problemenlijst, services, samenwerkingsvereisten) wordt hergebruikt en herschreven rond het AI-verhaal, niet from scratch]
## Beslissingsgeschiedenis

- 2026-06-10: Initiële briefing op basis van UX-audit umanex.be (audits/2026-06-10-ux-audit-umanex-be.md).
- 2026-06-10: Kritische items beslist door Jeroen — multi-page i.p.v. one-pager, contact via boekingslink i.p.v. alleen mailto/tel, app-naam `apps/portfolio`, 2–3 cases bij launch.
