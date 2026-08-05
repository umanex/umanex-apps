# TC-EBC — MilestoneOverlay: tussentijdse mijlpaal-melding (audit cluster 8)

- **Datum:** 2026-07-08
- **Type:** component (transient overlay)
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gepland — design-beslissingen genomen, klaar voor Figma-build

---

```
TASK:        De tussentijdse mijlpaal-overlay (kort bericht dat mid-workout in beeld pops) een
             Figma-design geven, en het onderscheid met de goal-reached viering (Toast) beslissen.
CONTEXT:     Audit cluster 8 (MIDDEL). components/MilestoneOverlay.tsx toont mid-workout kort een
             kaart met tekst (bv. een bereikte mijlpaal), auto-dismisst na 1,5s, pointerEvents none.
             Geen Figma-design (figma-map: node-id leeg). Onderscheiden van de goal-reached
             MotivationalToast (viering, node 5:5, cluster 2). Legacy font (BarlowCondensed 24px).
ELEMENTS:    Gecentreerde kaart (bg.elevated, radius 22, padding 32/24) met één regel tekst,
             fade-in + spring-scale (0.8→1), fade-out na 1,5s.
BEHAVIOUR:   Verschijnt zodra er een message is; niet-interactief (pointerEvents none); verdwijnt
             automatisch. Nieuwe message reset de animatie/timer.
CONSTRAINTS: RN/Expo · token-only · StyleSheet · non-blocking (geen scrim, geen knop) · onderscheid
             met de goal-reached Toast (die is wél interactief/viering-only).
```

---

## Beslissingen (2026-07-08, door Jeroen)

- **Visuele rijkdom (vraag 2+4):** **uitbundig / gamified** — badge/icoon + **Confetti** (het
  bestaande `Confetti`-component) bij de mijlpaal. Kaart mag accent-rand/glow krijgen.
- **Type-DNA (vraag 3):** **migreren** — mijlpaal-tekst → Source Serif SemiBold/Bold (weg van
  BarlowCondensed).
- **Onderscheid met de goal-reached Toast (vraag 1):** beide mogen nu gamified; onderscheid maken
  via **intensiteit** — milestone = korte confetti-burst + badge, auto-dismiss; Toast = volledige
  eind-viering (interactief). Ontwerp ze naast elkaar zodat het verschil leest.
- **Edge cases (vraag 5):** laatste-wint behouden (geen queue); kaart max 2 regels.

---

## Open vragen (design-beslissingen)

1. **Onderscheid met de goal-reached Toast (kritisch):** MilestoneOverlay = tussentijdse mijlpaal
   (non-blocking, auto-dismiss); MotivationalToast = eind-viering (node 5:5, cluster 2). Hoe visueel
   onderscheiden zodat ze niet door elkaar lopen? *Meest plausibel: milestone = compacte, subtielere
   kaart zonder accent-fill; viering = uitbundiger (accent, confetti).*
2. **Rijkere inhoud (kritisch — elements):** blijft het puur tekst, of icoon/emoji/badge (bv. medaille,
   afstand-mijlpaal-icoon) en/of Confetti (er is een `Confetti`-component)? *Meest plausibel: klein
   icoon/badge links van de tekst; confetti reserveren voor de eind-viering.*
3. **Type-DNA (kritisch, gedeeld):** tekst = `displayBold` (BarlowCondensed 24px, legacy). Migreren
   naar Source Serif (bv. `typeStyles.sectionValue` of een hero-achtige stijl)? *Meest plausibel: ja,
   Source Serif SemiBold/Bold.*
4. **Kaart-styling:** `bg.elevated` + radius 22, geen border/accent. Accent-rand of subtiele glow
   toevoegen voor herkenbaarheid, of neutraal (ShadCN) houden? *Meest plausibel: subtiele accent-rand.*
5. **Edge cases (kritisch):** (a) lange message (2 regels) — kaartbreedte/wrap; (b) snel opeenvolgende
   milestones — huidige code reset de timer per message (geen queue). Ontwerpen we een stapel/queue of
   blijft 'laatste wint'? *Meest plausibel: laatste-wint behouden; kaart max 2 regels.*

## Aannames

- `[ASSUMPTION]` Component-typologie = transient full-screen-centered overlay, non-interactief.
  Blijft zo.
- `[ASSUMPTION]` Interactie = geen (auto-dismiss 1,5s). Blijft zo.
- `[ASSUMPTION]` States = zichtbaar / verborgen (message aanwezig/null); geen error/loading.
- `[ASSUMPTION]` Eén component-frame; evt. één variant met icoon en één zonder.

## Acceptatie

- [ ] Onderscheid met de goal-reached Toast (vraag 1) visueel vastgelegd.
- [ ] Inhoud (vraag 2): tekst-only vs icoon/badge/confetti beslist en ontworpen.
- [ ] Type-DNA (vraag 3) toegepast op de mijlpaal-tekst.
- [ ] Kaart-styling (vraag 4) — neutraal vs accent — beslist.
- [ ] Edge cases (vraag 5): lange tekst + opeenvolging-gedrag zichtbaar/beslist.
- [ ] Figma token-bound; figma-map.md node-id ingevuld ('Workout / Milestone Overlay').

## Beslissingsgeschiedenis

- 2026-07-08: Briefing aangemaakt vanuit audit cluster 8 (design-backlog).
- 2026-07-08: Kruisbeslissingen genomen — uitbundig/gamified (confetti + badge), DNA migreren,
  onderscheid met de eind-viering-Toast via intensiteit. Scope-uitbreiding t.o.v. huidige tekst-kaart.
