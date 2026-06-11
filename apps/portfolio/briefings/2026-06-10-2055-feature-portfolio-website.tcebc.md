# TC-EBC — Portfolio website v2 (pivot: persoonlijke voorstelling)

- **Datum:** 2026-06-10
- **Type:** feature
- **Project:** portfolio (apps/portfolio)
- **Klant:** umanex (eigen werk)
- **Status:** gebouwd met placeholders — wacht op definitieve content van Jeroen

Vervangt de richting van `2026-06-10-feature-portfolio-website.tcebc.md` (diensten-site). Die blijft staan als historiek.

---

```
TASK:        Persoonlijke portfolio-site die Jeroen Colpaert voorstelt aan hiring-beslissers (project managers, design leads, UX leads, product leads) bij KMO's en grotere bedrijven met sterke B2B-kant — van scratch, met de huidige umanex.be alleen als input.
CONTEXT:     Volledige pivot van v1. Drie kernboodschappen: (1) ruime ervaring over het hele design proces, (2) omgang met stakeholders in soms moeilijke omgevingen, (3) innovatie via AI-focus. Jeroen staat voorop, umanex is het label eronder.
ELEMENTS:    Multi-page: home (persoonlijke hero met foto-placeholder, ervaring-highlights, AI/innovatie-sectie, bewijs-teasers, contact), carrière-overzicht (rollen/sectoren als verhaal), cases-overzicht + detail (klantwerk + eigen producten), testimonials-sectie, werkwijze/AI-pagina. Navigatie, theme toggle, footer met zakelijke info.
BEHAVIOUR:   Scroll-gedreven met subtiele, klassevolle animaties (entrance reveals, staggers, micro-interacties — concept ter goedkeuring); klik + keyboard; prefers-reduced-motion volledig gerespecteerd; contact via boekingslink (URL open) + mailto + tel.
CONSTRAINTS: Zelfde tokens (packages/tokens — geen wijzigingen), layout volledig vrij t.o.v. huidige site; Next.js 14 App Router, TypeScript strict, Tailwind, @umanex/ui; NL; mobile-first; toegankelijkheid als basisprincipe; Vercel (production deploy manueel door Jeroen); herwerkt op branch feature/portfolio-app (PR #61).
```

---

## Beantwoorde kritische items (2026-06-10)

1. **Component-typologie (site-structuur):** multi-page, herbevestigd na pivot.
2. **States:** theme light/dark (persistent); animatie-states incl. reduced-motion variant; geen formulier-states (boekingslink/mailto); cases en testimonials statisch.
3. **Interactie-modaliteit:** klik + scroll + keyboard, aangevuld met scroll-getriggerde animaties en hover-micro-interacties.
4. **Edge cases:** afhankelijk van aan te leveren content (aantal cases, lengte carrière-overzicht, aantal testimonials) — open tot content binnen is.

## Beslist (2026-06-10, tweede ronde)

- **Branding:** Jeroen voorop (naam, verhaal, foto), umanex als label.
- **Bewijslaag:** alle vier — klantwerk-cases, carrière-overzicht, testimonials, eigen producten.
- **Animatie-techniek:** Jeroen beslist na concept-voorstel van Claude.
- **Taal:** Nederlands.
- **PR #61:** herwerken op dezelfde branch; technische basis blijft, alle pagina's/componenten/copy van scratch.
- **Foto:** nog niet beschikbaar — placeholder + afmetings-spec, hero ontworpen op foto.

## Beslist (2026-06-10, derde ronde — content-antwoorden)

- **Klantwerk:** Adhese, Luminus en Columba mogen bij naam genoemd worden. Columba-kernverhaal: centrale repository van waaruit specifieke apps gebouwd worden. Detail-copy: placeholders + TODO.
- **Carrière, stakeholder-verhalen, testimonials:** placeholders + TODO in `lib/career.ts`, `lib/cases.ts` en `lib/testimonials.ts` — Jeroen vult aan.
- **Eigen werk:** RowTrack + het umanex-os werkingsprincipe (ook implementeerbaar bij klanten) — uitgewerkt op /werkwijze en als case.
- **Boekingslink:** voorlopig zonder Calendly — mailto met TODO in `lib/site.ts`.
- **Animaties:** concept goedgekeurd; Framer Motion geïnstalleerd (`Reveal` component, prefers-reduced-motion gerespecteerd).

## Open vragen (resterende content-input)

1. Definitieve copy voor alle `[Placeholder]`-velden: carrière-feiten, Adhese/Luminus/Columba-details, stakeholder-verhalen, testimonials.
2. Portretfoto (4:5, min. 800×1000 px) — placeholder met spec staat klaar.
3. Calendly-URL zodra beschikbaar.

## Aannames

Geen — op expliciete vraag van Jeroen worden ontbrekende items als open vraag gesteld, niet aangenomen.

## Beslissingsgeschiedenis

- 2026-06-10: **Pivot** — van diensten-site (v1) naar persoonlijke voorstelling voor hiring-beslissers. Doelgroep verengd naar PM's/design/UX/product leads bij KMO's en grotere B2B-bedrijven. Drie kernboodschappen vastgelegd (ervaring, stakeholders, AI-innovatie). Layout volledig vrij, tokens blijven. Subtiele klassevolle animaties toegevoegd aan scope.
- 2026-06-10: Structuurbeslissingen tweede ronde — Jeroen voorop met umanex als label, multi-page herbevestigd, bewijslaag = alle vier de vormen, NL, herwerken op branch feature/portfolio-app, nieuwe briefing naast v1, foto volgt later.
- 2026-06-10: Content-ronde — klantnamen Adhese/Luminus/Columba goedgekeurd, Columba-kernverhaal vastgelegd, eigen werk = RowTrack + umanex-os, animatieconcept goedgekeurd (Framer Motion), rest als placeholder gebouwd. Site v2 volledig herbouwd op feature/portfolio-app.
