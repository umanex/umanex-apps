# Maandelijks budget bewerkbaar in de ankermaand

- **Datum:** 2026-08-06
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Het bedragveld van een maandelijks budget is ook in de huidige actieve maand
             bewerkbaar, zodat het budget van déze maand handmatig bijgesteld kan worden.

CONTEXT:     Ledger-rij in de sectie "Maandelijkse budgetten" van MonthCard
             (ReservationSection > DraggablePotRow). Vandaag toont dat veld in de
             ankermaand de resterende provisie en staat het disabled; in latere maanden
             toont hetzelfde veld het budgetbedrag en is het wél bewerkbaar. Bijstellen
             kon dus alleen vooruit of via het maandbedrag in ReservationSidepanel — dat
             laatste raakt élke maand zonder afrekening.

ELEMENTS:    - DraggablePotRow: het bedragveld — voortaan overal het budget van die maand
             - DraggablePotRow: subregel "Resterend: €X" onder het label (ankermaand,
               budget) — neemt de rol over die het veld had
             - DraggablePotRow: "(€begroot)" naast het veld bij een afwijkend bedrag
             - SectionBar "Maandelijkse budgetten": kop beweegt mee tijdens het typen

BEHAVIOUR:   Typen + wegklikken legt het bedrag vast als afrekening voor die ene maand
             (upsertReservationSettlement); gelijk aan het begrote bedrag → afrekening
             weg. Leeg, negatief of onleesbaar → terug naar het begrote bedrag, afrekening
             weg. In de ankermaand is de kost van een budget het onbestede deel
             (budget − betaald uit de pot), dus daalt de subregel "Resterend" en de
             sectiekop mee met het nieuwe bedrag. Zet je het budget onder wat er deze
             maand al uit betaald is, dan toont "Resterend" negatief met ⚠ en is de kost
             €0 — het teveel is al van het banksaldo af. Afgesloten maanden blijven op
             slot; een gefinaliseerd budget blijft read-only.

CONSTRAINTS: Desktop-first, bestaande tokens en rollaag, geen nieuwe dependencies.
             Rekenkern blijft in calculator.ts/subtotals.ts — de sectie dupliceert geen
             math, ze leest `provisionThisMonth` en legt enkel het live-getypte verschil
             erbovenop. Zichtbare sectiesubtotalen blijven optellen tot het eindsaldo.
             Gedrag in latere maanden verandert niet.
```

---

## Open vragen

_(leeg — alle kritische items beantwoord)_

## Aannames

- `[ASSUMPTION: veldbetekenis]` Het veld krijgt in álle maanden dezelfde betekenis: het
  budget van die maand. De resterende provisie verhuist naar de subregel die elke andere
  potrij al heeft. Alternatief was het veld het restbedrag laten tonen en dát bewerkbaar
  maken (budget = getypt + reeds betaald) — afgewezen: dan bewerk je een afgeleide waarde
  en betekent hetzelfde veld iets anders per kolom.
- `[ASSUMPTION: states]` Geen loading/empty/error: alles komt synchroon uit de
  Zustand-store, net als bij de andere ledger-velden. Relevante toestanden: begroot ·
  aangepast · gefinaliseerd · maand afgesloten · resterend negatief.
- `[ASSUMPTION: interactie]` Klik + typen, bevestigen op blur — hetzelfde patroon als de
  velden voor provisies en het beginsaldo. Geen Enter-afhandeling (die is er nergens).
- `[ASSUMPTION: scope]` Bijstellen geldt voor die ene maand. Wie het budget structureel
  wil wijzigen doet dat in ReservationSidepanel; dat pad blijft ongewijzigd.

## Acceptatie

- [x] Budgetveld in de ankermaand is bewerkbaar en toont het budget van die maand
      (begroot bedrag, of de afrekening als die er is)
- [x] Een aangepast bedrag wordt opgeslagen als afrekening voor die maand; het begrote
      bedrag blijft zichtbaar tussen haakjes — op scherm: Parking 106,40 → 150 toont
      "(€ 106,40)" ernaast
- [x] Terugzetten naar het begrote bedrag verwijdert de afrekening
- [x] Leeg / negatief / onleesbaar → veld valt terug op het begrote bedrag, geen afrekening
- [x] Subregel "Resterend" toont in de ankermaand budget − betaald uit de pot, negatief
      met ⚠ — en beweegt mee tijdens het typen, net als de kop
- [x] Sectiekop "Maandelijkse budgetten" beweegt mee tijdens het typen en klopt na het
      opslaan met het subtotaal uit de rekenkern (€ 1.110,37 vóór én ná opslaan)
- [x] Budget onder het reeds betaalde bedrag → kost €0, geen negatieve kost die het
      eindsaldo optilt — S24 in `buffer-scenarios.ts`, en op scherm bij budget 20 <
      betaald 39,63
- [x] Latere maanden gedragen zich exact zoals voordien — `calc-baseline.ts` over 300
      scenario's: élk verschil met de vorige versie is de nieuwe ondergrens op een budget
      in een ankermaand (8 scenario's), de rest is identiek
- [x] Gefinaliseerd budget blijft read-only. Afgesloten maand: de `fieldset disabled` op
      MonthCard is ongewijzigd en schakelt dit veld op dezelfde manier uit als elk ander
      ledger-veld. Niet op scherm gezien — in het huidige venster is geen afgesloten maand
      bereikbaar.
- [x] `pnpm --filter cashflow build` en `type-check` slagen, geen `any`
- [x] `anchor-scenarios.ts` 48/48 en `buffer-scenarios.ts` 510/510 (was 465, +45 uit S24)

## Beslissingsgeschiedenis

- 2026-08-06: Het bedragveld krijgt in elke maand dezelfde betekenis (budget van die
  maand); de resterende provisie verhuist naar de subregel. Reden: één veld dat per kolom
  iets anders betekent was precies waarom het disabled moest staan.
- 2026-08-06: Ondergrens op de budgetkost in de ankermaand toegevoegd. Zonder die grens
  werd een budget onder het reeds betaalde bedrag een negatieve kost — met het veld op
  slot was dat nauwelijks bereikbaar, met een bewerkbaar veld is het één toetsaanslag.

## Beoordeling

`displayContribution` is verdwenen uit `ReservationPotBalance`: het veld bestond enkel om
de oude "veld toont restbedrag"-lezing te dragen en werd door niemand meer gelezen. Het
laten staan zou de volgende lezer naar precies het model sturen dat hier vervangen is.

De kostformules van een pot staan nu als `budgetCost`/`spaardoelCost` in `subtotals.ts` en
worden door zowel het subtotaal als de live-kop (`pendingOverrideDelta`) gebruikt. Vóór
deze wijziging telde een override in de ankermaand niet mee in de kop — dat kon ook niet
kloppen zolang de kop daar een restbedrag toont en het veld een storting.
