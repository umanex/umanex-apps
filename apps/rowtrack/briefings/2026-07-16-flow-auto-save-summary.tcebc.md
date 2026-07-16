# TC-EBC — Auto-save flow + samenvatting zonder opslaan-knop

**Datum:** 2026-07-16
**Type:** flow
**Project:** rowtrack
**Klant:** umanex
**Status:** gepland

---

```
TASK:        Een rit wordt automatisch (achtergrond) opgeslagen zodra ze eindigt — bij
             handmatig stoppen én bij doel-bereikt. Geen expliciete "Opslaan"/"Annuleren"
             meer; overal enkel "Ga verder".
CONTEXT:     Active workout einde-flow (workout.tsx + ActivePhase summary + MotivationalToast).
ELEMENTS:    Samenvattingsscherm (enkel "Ga verder"), "Doel bereikt"-celebration ("Ga verder").
BEHAVIOUR:   - Handmatig Stop → auto-save (achtergrond) → samenvatting → "Ga verder" → home.
             - Doel bereikt → auto-save → celebration → "Ga verder" → samenvatting → "Ga verder" → home.
             - Lege rit (geen data) wordt NIET opgeslagen; verwijderen kan achteraf via Historiek.
             - Save gebruikt de bestaande logica incl. pendingWorkout-backstop bij netwerkfout.
CONSTRAINTS: Geen dubbel-save (doel-bereikt + stop). Geen "Annuleren"/discard-pad meer.
             RN/Expo, tokens, dark mode.
```

Beslissingen (via vraag aan Jeroen, 2026-07-16):
- Annuleren/verwijderen op eindscherm: **weg** — enkel "Ga verder"; verwijderen via Historiek.
- Doel-bereikt: **celebration → samenvatting** (niet direct home).

---

## Open vragen

_(geen — flow bevestigd)_

## Aannames

- [ASSUMPTION: doel-bereikt beëindigt de rit (celebration → samenvatting); je roeit niet verder]
- [ASSUMPTION: bij doel-bereikt wordt bij het openen van de celebration al opgeslagen; de latere stop-actie bestaat dan niet meer voor die rit → geen dubbel-save]
- [ASSUMPTION: `saving`-loading state vervalt op de knop; save is achtergrond met pendingWorkout-backstop]

## Acceptatie

- [ ] Handmatig Stop slaat de rit op (achtergrond) en toont de samenvatting
- [ ] Samenvatting heeft enkel een "Ga verder"-knop → home; geen Opslaan/Annuleren
- [ ] Doel-bereikt slaat op, toont celebration → "Ga verder" → samenvatting → "Ga verder" → home
- [ ] Rit wordt exact één keer opgeslagen (geen duplicaat bij doel-bereikt)
- [ ] Lege rit (tickCount 0) wordt niet opgeslagen, geen fout-alert; flow blijft werken
- [ ] Netwerkfout → pendingWorkout-backstop blijft werken (geen dataverlies)

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — auto-save bij einde + samenvatting/celebration enkel "Ga verder".
