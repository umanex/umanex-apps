# Restyle — speelse rode accenten op lichte basis

**Datum:** 2026-06-10
**Type:** feature
**Project:** portfolio (apps/portfolio)
**Klant:** umanex
**Status:** in uitvoering

---

```
TASK:        Restyle de portfolio site van donkergrijze basis naar lichte, frisse basis met speelse rode accenten en grijze/zwarte tekst.
CONTEXT:     umanex.be portfolio v2 (personal presentation site) — site-brede visuele laag, geen structuurwijzigingen.
ELEMENTS:    Kleursysteem (CSS variabelen / Tailwind theme), alle bestaande secties en componenten van de presentatiesite.
BEHAVIOUR:   Geen interactiewijzigingen. Hover/focus/active states kleuren mee met het nieuwe rode accent. Bestaande framer-motion animaties blijven en mogen het "dynamische" gevoel versterken.
CONSTRAINTS: ShadCN-stijl basis (minimaal, modern) maar met speels/fris karakter via accentkleur. Tekst grijs en zwart op lichte achtergrond. Toegankelijk contrast (AA) voor tekst en accent. Mobile-first. Geen hardcoded waardes buiten het centrale kleursysteem.
```

---

## Open vragen

- Exacte rode tint — geen rood token aanwezig in bestaande project-context; keuze wordt voorgesteld bij implementatie.
- Dark mode: profile zegt "light + dark altijd ondersteund" — geldt dat ook voor deze v2, en hoe vertaalt het speelse rood zich daar?

## Aannames

- [ASSUMPTION: "fris" = lichte basis — wit/off-white achtergrond in plaats van donkergrijs]
- [ASSUMPTION: component-typologie, states en edge cases zijn niet van toepassing — dit is een site-brede restyle, geen nieuw component]
- [ASSUMPTION: interactie-modaliteit ongewijzigd — bestaande klik/scroll-interacties blijven]

## Beslissingsgeschiedenis

- 2026-06-10: Basiskleur gekanteld van donkergrijs (v2 briefing) naar lichte basis met rode accenten.
