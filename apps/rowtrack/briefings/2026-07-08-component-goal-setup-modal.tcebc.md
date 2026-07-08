# TC-EBC — GoalSetupModal: doel instellen mid-workout (audit cluster 8)

- **Datum:** 2026-07-08
- **Type:** component (modal met states)
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gepland — design-beslissingen genomen, klaar voor Figma-build

---

```
TASK:        De mid-workout 'doel instellen'-modal een Figma-design geven, en de consistentie met
             de bestaande doel-instel-flows (IdlePhase, Profile 'Doel bewerken') beslissen.
CONTEXT:     Audit cluster 8 (HOOG). components/GoalSetupModal.tsx opent vanuit ActivePhase mid-
             workout (doeltype-selectie + streefwaarde). Er is GEEN Figma-equivalent; de IdlePhase-
             doel-set (node 35:1506, wheel picker + nudge) en Profile 'Doel bewerken' (52:9730)
             dekken andere flows met een ANDERE UI. Gebruikt legacy fonts (Inter/JetBrainsMono).
ELEMENTS:    Header (titel 'Stel doel in' + sluit-X), segmented control (4 doeltypes met icoon+label),
             grote numerieke input (mono, centered) + unit-label rechts, 'Stel in'-knop (lg,
             disabled bij invalid), 'Wis doel'-knop (ghost, alleen bij bestaand doel).
BEHAVIOUR:   Centered modal (transparent, fade, scrim 0.7). Doeltype kiezen wist de input; numeriek
             invoeren; 'Stel in' actief zodra waarde > 0. Bij edit: velden prefilled + Wis-knop.
CONSTRAINTS: RN/Expo · token-only · StyleSheet · vrije numerieke input HEEFT GEEN min/max-grenzen
             (IdlePhase-wheel wel: dur 1–180min, dist 500m–42km, split 1:30–3:00, watts 50–500).
```

---

## Beslissingen (2026-07-08, door Jeroen)

- **Invoer-patroon (vraag 1+2+6):** **compact numeriek behouden** (snelle mid-workout-onderbreking) —
  centered modal blijft, GEEN wheel picker. Wél visueel afstemmen op de IdlePhase-taal, en de
  min/max-grenzen afdwingen die de wheel wél heeft (dur 1–180min, dist 500m–42km, split 1:30–3:00,
  watts 50–500).
- **Type-DNA (vraag 4):** **migreren** — titel/waarde → Source Serif; segment/unit → Albert Sans.
  Legacy Inter/JetBrainsMono valt weg.
- **Nog open (mijn defaults):** vraag 3 → `GoalSegments`/`Segment` hergebruiken i.p.v. eigen inline
  control; vraag 5 → validatie tegen grenzen met subtiele inline hint (geen losse error-state, geen
  loading).

---

## Open vragen (design-beslissingen)

1. **Consistentie-kernvraag (kritisch):** dit is de tweede, afwijkende UI voor dezelfde taak
   (doel instellen). IdlePhase gebruikt een **wheel picker + nudge-knoppen** (heeft design);
   GoalSetupModal gebruikt een **segmented control + vrije numerieke input** (geen design).
   Harmoniseren naar één patroon (wheel), of blijft de mid-workout-variant bewust compacter/sneller?
   *Meest plausibel: mid-workout compact houden (snelle numerieke invoer), maar visueel afstemmen op
   IdlePhase-taal.*
2. **Component-typologie (kritisch):** centered modal (huidig) of bottom-sheet (er is een BottomSheet
   in de app)? *Meest plausibel: centered modal behouden — snelle mid-workout-onderbreking.*
3. **Segmented control:** eigen inline control (huidig) of de bestaande `GoalSegments`/`Segment`-
   component hergebruiken zodat het één design volgt? *Meest plausibel: GoalSegments hergebruiken.*
4. **Type-DNA (kritisch, gedeeld):** titel `displaySemiBold` (Inter), segment `bodySemiBold`, input
   `monoMedium` (JetBrainsMono 36px), unit `bodyMedium` — allemaal legacy. Migreren naar Source Serif
   (waarde/titel) + Albert Sans (labels)? *Meest plausibel: ja, migreren.*
5. **States (kritisch):** aanwezig zijn default (nieuw), edit (prefilled + Wis), invalid (Stel-in
   disabled). Nodig: error-state (bv. buiten grenzen) en/of loading? *Meest plausibel: valideer tegen
   min/max met inline hint i.p.v. losse error; geen loading (lokale set).*
6. **Edge cases (kritisch):** de vrije input mist de min/max-grenzen die de IdlePhase-wheel wél
   afdwingt → een gebruiker kan een onrealistisch doel invoeren (bv. 9999 min). Grenzen toevoegen +
   in het design tonen (helper-tekst of clamp)? *Meest plausibel: grenzen afdwingen + subtiele hint.*

## Aannames

- `[ASSUMPTION]` Interactie = klik (segment/knoppen) + numeriek keyboard (input). Blijft zo.
- `[ASSUMPTION]` Vier doeltypes in vaste `GOAL_TYPE_ORDER`; icoonset = Ionicons (`@expo/vector-icons`).
- `[ASSUMPTION]` Eén component-frame met variant-set (default / edit / invalid) op de Components-pagina.

## Acceptatie

- [ ] Consistentie-beslissing (vraag 1) vastgelegd t.o.v. IdlePhase/Profile.
- [ ] Component-typologie (vraag 2) bevestigd (modal vs sheet).
- [ ] Segmented control (vraag 3) — eigen vs GoalSegments — beslist en in Figma.
- [ ] Type-DNA (vraag 4) toegepast op titel, segment, input, unit.
- [ ] States (vraag 5) als varianten: default, edit (+Wis), invalid[, error].
- [ ] Min/max-grenzen (vraag 6) in code + zichtbaar in design.
- [ ] Figma token-bound; figma-map.md node-id ingevuld (nu leeg voor 'Workout / Goal Setup Modal').

## Beslissingsgeschiedenis

- 2026-07-08: Briefing aangemaakt vanuit audit cluster 8 (design-backlog).
- 2026-07-08: Kruisbeslissingen genomen — compact numeriek + centered modal behouden (geen wheel),
  visueel afstemmen op IdlePhase, min/max afdwingen; DNA migreren. Code-implicatie: min/max-clamp
  toevoegen aan de nu-ongebonden vrije input.
