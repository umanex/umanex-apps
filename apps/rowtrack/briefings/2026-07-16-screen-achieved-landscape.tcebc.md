# TC-EBC — "Doel bereikt" celebration: redesign + landscape

**Datum:** 2026-07-16
**Type:** screen
**Project:** rowtrack
**Klant:** umanex
**Status:** gepland

---

```
TASK:        Neem het aangepaste "Doel bereikt"-celebration-scherm over uit Figma en
             maak het óók zichtbaar in landscape (nu enkel portrait).
CONTEXT:     Active workout → doel bereikt. Full-screen overlay boven confetti-bg met een
             gecentreerde card. Getriggerd door goalReached (nu via MotivationalToast in
             ActivePhase). Portrait bestaat, landscape ontbreekt.
ELEMENTS:    Confetti-achtergrond (full screen), card (trofee-emoji, "Doel bereikt!"-titel,
             coaching-subtitle "Je hebt {x} geroeid. Geweldig gedaan! 💪", "Ga verder →"-knop).
BEHAVIOUR:   Verschijnt bij doel-bereikt; "Ga verder" dismisst (bestaand gedrag behouden).
             Card gecentreerd in beide oriëntaties; in landscape smaller/gecentreerd i.p.v.
             portrait-onderaan.
CONSTRAINTS: React Native/Expo, RowTrack-tokens, StyleSheet. Dark mode. Safe-area-aware.
             Figma portrait 5:5, landscape 378:2874 = bron.
```

Figma: [Portrait 5-5](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=5-5) · [Landscape 378-2874](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=378-2874)

---

## Open vragen

_(geen blokkerende — redesign van bestaand component met behoud van gedrag)_

## Aannames

- [ASSUMPTION: dismiss-gedrag ("Ga verder" + eventuele auto-dismiss/haptics) blijft zoals nu; enkel visueel + landscape wijzigt]
- [ASSUMPTION: het huidige celebration-component is `MotivationalToast` — te bevestigen bij build]
- [ASSUMPTION: confetti-animatie blijft de bestaande implementatie; geen nieuwe lib]

## Acceptatie

- [ ] Card + inhoud matchen Figma 5:5 (portrait) — trofee, titel, subtitle, knop, spacing
- [ ] Scherm rendert correct in landscape en matcht 378:2874 (gecentreerde card)
- [ ] Dismiss via "Ga verder" werkt in beide oriëntaties
- [ ] Safe-areas gerespecteerd (notch/home-indicator, ook landscape zijkant)
- [ ] Tokens only (geen hardcoded kleur/spacing/size); dark mode correct

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — celebration redesign + landscape-ondersteuning.
