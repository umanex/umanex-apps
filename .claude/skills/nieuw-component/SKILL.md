---
name: nieuw-component
description: Scaffoldt een nieuw React/TypeScript component volgens de globale umanex-conventies en de klant-/projectcontext. Gebruik deze skill altijd wanneer de gebruiker een nieuw component wil bouwen, vraagt om een component te scaffolden, of zegt "maak een nieuwe component", "voeg een component toe", "bouw een component voor".
---

## Werkwijze

Dit is een **globale, klant-agnostische skill**. De conventies komen uit de gelaagde CLAUDE.md: de globale component-regels (1 component = 1 file, PascalCase, props als `type`, plain function, geen hardcoded waarden) in de globale CLAUDE.md; klant-specifieke folders, feature-mappen en de complex-UI library in de klant-CLAUDE.md; per-project afwijkingen in de project-CLAUDE.md. De skill verwijst naar die lagen — ze worden hier niet gedupliceerd.

Het bouwen van een nieuw component is een **design-taak**: de eerste stap is altijd een TC-EBC (stap 1).

### Stap 1 — Schrijf een TC-EBC (in de main-agent context)

De eerste actie is een TC-EBC — vóór je de codebase verkent of verduidelijkingsvragen stelt, en in de main-agent context (niet uitbesteed aan een sub-agent). Volg het volledige TC-EBC-werkprincipe in CLAUDE.md (sanity check, stappenplan, bestandslocatie en -naamgeving, inline tonen). Dupliceer dat framework hier niet; deze stap voegt enkel de component-specifieke invulling toe.

- **Type**: vrijwel altijd `component` (zie de type-set in CLAUDE.md).
- **Valideer de vier kritische items**, vertaald naar component-termen — vraag enkel wat de klant-/projectcontext niet al beantwoordt:
  - *Component-typologie* — ui-primitive, compositie, overlay (sheet / modal / popover / tooltip), of inline. Bepaalt meteen de doelmap in stap 3.
  - *States* — loading / empty / error / success / default. Voor data-gedreven componenten zijn loading/empty/error **default aanwezig** (anti-white-screen, zie CLAUDE.md *States zijn default, geen optie*); vraag welke afvallen, niet welke erbij moeten.
  - *Interactie-modaliteit* — klik / swipe / drag / keyboard / hover.
  - *Edge cases* — min/max waardes, lege staat, validatieregels.
- Niet-kritische items (doelgroep, device, data-shape) mogen een `[ASSUMPTION: …]` aanname zijn.
- **Visuele context** — bestaat er een `reference/`-map in het project (zie CLAUDE.md), bekijk dan de relevante schermen vóór je de TC-EBC afrondt; ze vullen vaak Elements en visuele constraints in.

Toon de TC-EBC inline en sla hem op volgens de locatie/naamgeving uit CLAUDE.md. Ga pas daarna door.

### Stap 2 — Controleer of er een Figma node bestaat

Vraag de gebruiker: "Is er een Figma node voor dit component? Zo ja, geef de URL."

- Indien ja → gebruik de `figma-naar-code` skill om te starten vanuit het design. De node vult meteen verschillende TC-EBC-items in (Elements, visuele constraints, vaak de states als varianten) — vraag die dan niet opnieuw.
- Indien nee → bouw vanuit de conventies hieronder.

### Stap 3 — Bepaal het juiste mapje

Gebruik de globale categorieën uit CLAUDE.md als basis:

```
components/
├── ui/            (primitives)
├── forms/         (input componenten + form composities)
├── layout/        (header, sidebar, container, grid)
├── feedback/      (toast, alert, empty state, loading, error)
├── navigation/    (tabs, breadcrumbs, menu, pagination)
├── data-display/  (table, list, card, chart)
└── overlay/       (modal, sheet, popover, tooltip)
```

Klant- of project-specifieke **feature-folders** (bv. een domein-map zoals `features/kaart/`) staan in de klant-CLAUDE.md. Raadpleeg die voor je plaatst. Bij twijfel over de categorie: vraag expliciet voor je plaatst (conform CLAUDE.md).

### Stap 4 — Bestand aanmaken

Eén component per bestand, bestandsnaam in PascalCase. Volg de globale TypeScript-conventies — `type` (niet `interface`), plain function (geen `React.FC`):

```tsx
// @figma [URL indien beschikbaar, anders weglaten]

import { type ReactNode } from 'react'

type ComponentNaamProps = {
  // props
}

export const ComponentNaam = ({ ...props }: ComponentNaamProps) => {
  return (
    // JSX
  )
}
```

Zie `references/component-template.tsx` voor een volledig voorbeeld.

### Stap 5 — Styling regels

- Geen hardcoded kleuren — altijd via het token-pad (Tailwind class of CSS variable die naar een token mapt)
- Geen inline styles tenzij dynamisch (bv. kaart-/canvas-positioning)
- Tailwind voor layout, spacing, flex
- Spacing via een spacing-token, border radius via een radius-token — nooit losse pixelwaarden
- De **complex-UI library** (bv. ShadCN, MUI, of een klant-eigen library) verschilt per klant — zie klant-CLAUDE.md. Pas library-componenten nooit direct aan.

### Stap 6 — Figma-koppeling via de header (geen hand-tabel)

Zorg dat de `// @figma [node-URL]` header bovenaan het bestand staat (stap 4). Dat is de **machine-leesbare bron** waaruit de component-inventaris wordt afgeleid: `gen-snapshot.sh` harvestt de header (+ een eventuele `<ComponentNaam>.design-snapshot.md` sidecar) tot de *Componenten*-sectie in `apps/{app}/context-snapshot.md`, gegenereerd bij elke commit.

Onderhoud dus **geen** handmatige mapping-tabel meer — die verrotte en werd alleen door deze skill gevuld (`figma-naar-code` schreef er nooit naar terug). Is er nog geen Figma-node, laat de header weg; het component verschijnt dan met Figma-status `—` in de inventaris, wat het gat zichtbaar maakt.
