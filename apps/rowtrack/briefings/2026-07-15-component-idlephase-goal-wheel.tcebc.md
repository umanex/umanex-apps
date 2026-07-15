# TC-EBC — IdlePhase goal-wheel (doel-selectie) → Figma

- **Datum:** 2026-07-15
- **Type:** component
- **Project:** rowtrack
- **Klant:** umanex (eigen product)
- **Status:** gevalideerd
- **Richting:** Code → Figma (source-of-truth = code)

---

```
TASK:        Exporteer de IdlePhase goal-target WheelPicker (zoals bij het
             instellen van een doel) naar Figma, met token-binding.
CONTEXT:     Workout-tab, idle-fase. Bij een gekozen doeltype scrollt de
             gebruiker de streefwaarde op een wheel. Bron: components/workout/
             IdlePhase.tsx + components/WheelPicker.tsx. Verschilt van de
             profiel-sheet-wheels: on-screen op bg.base i.p.v. in een sheet.
ELEMENTS:    WheelPicker — visibleRows=5, surface='base', showPill=true:
             zichtbare pill (bg.raised, radius md), grote bold center-waarde
             (Albert Sans Bold 34) + 2 kleine neighbors per kant (Regular),
             edge-fade → bg.base.
BEHAVIOUR:   Verticale scroll met snap per item (ITEM_H 50 → pickerH 250) +
             selectie-haptic; center-rij = de gekozen streefwaarde. In Figma
             statisch: default-selectie + zichtbare pill.
CONSTRAINTS: Mobile portrait; RowTrack tokens (pill bg.raised, fade → bg.base);
             Figma-file T1bGrvIzSNeLyh5CbarATZ; token-binding verplicht (geen
             hardcoded fills). Bestaande component 'IdlePhase/Wheel' (36:1956)
             is een generieke template met leftover-content.
```

---

## Open vragen

- ~~**Doeltype-variant:**~~ → **Gekozen:** de default van de bestaande component (Duur, 28–32 min, center **30 min**). De 4 varianten (Afstand/Split/Watt) kunnen later toegevoegd als Jeroen dat wil.
- ~~**Doel-node:**~~ → **Gekozen:** een **standalone export-frame** (`377:2552`, "IdlePhase/Wheel — Goal + fade") = een verse instance van component `36:1956` op een `bg/base`-achtergrond met de fade-gradients erover. Bewust standalone (niet in de component gebakken): de fade is **surface-afhankelijk** (fade → bg.base) en heeft dus een bekende achtergrond nodig; de 4 bestaande instances + de master blijven ongemoeid.

## Aannames

- [ASSUMPTION] Statische default-selectie (geen scroll-animatie in Figma).
- [ASSUMPTION] Pill is hier wél zichtbaar (bg.raised op bg.base contrasteert), i.t.t. de profiel-sheet-wheels waar de band onzichtbaar bleef.

## Acceptatie

- [x] Goal-wheel frame (`377:2552`): 5 zichtbare rijen (28/29 · **30** · 31/32 min), zichtbare pill (uit de component, bg.raised, radius md)
- [x] Grote bold center (Albert Sans Bold 34) + dimming-neighbors (opacity 0.75/0.5 uit de component) + **edge-fade → bg.base** (top + bottom gradient, expliciet gevraagd)
- [~] Token-binding: wrapper-achtergrond gebonden aan `bg/base`; pill + tekst erven de bindings van component `36:1956`. **Caveat:** de fade-gradient-stops gebruiken de resolved `bg.base`-waarde (Figma variable-binding op gradient-stops is een randgeval), en de units renderen cursief (bestaande component-stijl, code = Albert Sans Regular).
- [x] Waarden = de component-default (Duur 28–32 min, `buildDurItems`)
- [x] Visuele parity-screenshot bevestigt de fade-richting + zichtbare pill

## Beslissingsgeschiedenis

- 2026-07-15: aangemaakt — vervolg op de profiel-metric-sheets (`2026-07-15-component-profile-metric-sheets.tcebc.md`); dit is de on-screen goal-variant van dezelfde WheelPicker (5 rijen + zichtbare pill).
- 2026-07-15: **standalone export mét fade** (`377:2552`) — verse instance van component `36:1956` op `bg/base`-backdrop + top/bottom fade-gradients. De bestaande component miste de fade (enkel pill + opacity-dimming); toegevoegd zonder de master/instances te raken, omdat de fade surface-afhankelijk is.
- 2026-07-15: **units cursief = bestaande component-stijl**, niet overgenomen uit code (code = Albert Sans Regular). Bewust niet gewijzigd in de master; genoteerd als aandachtspunt.
