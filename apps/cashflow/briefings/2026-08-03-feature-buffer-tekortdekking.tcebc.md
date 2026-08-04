# Buffer — automatische tekortdekking

- **Datum:** 2026-08-03
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gepland

---

```
TASK:        Een provisie-pot die als "buffer" gemarkeerd is, vult zichzelf automatisch
             aan met een negatieve waarde zodra het eindsaldo van een maand negatief
             uitkomt — tot het eindsaldo exact €0 is, begrensd door het potsaldo.

CONTEXT:     Cashflow-prognose, sectie "Provisies" (spaardoel-potten) in elke MonthCard.
             Jeroen houdt een pot "Buffer" aan waarin hij maandelijks stort; die pot
             dient om magere maanden op te vangen. Vandaag moet hij die opname manueel
             invullen, maar het invoerveld weigert negatieve bedragen.

ELEMENTS:    - Toggle "Vangt tekorten op" per spaardoel in ReservationSidepanel (max 1 actief)
             - Buffer-rij in ReservationSection: read-only bedragveld bij actieve opname
             - Opname-indicatie op de buffer-rij (bedrag + herkomst-hint)
             - Sectiekop "Provisies": subtotaal mag negatief tonen
             - MonthCard: eindsaldo landt op €0 (of blijft rood bij ontoereikende pot)

BEHAVIOUR:   Per maand, ná alle andere kosten: bereken E(0) = eindsaldo met de
             buffer-storting op 0. Is het normale eindsaldo E(p) < 0, dan wordt de
             buffer-storting x = max(E(0), −potsaldo). Bij x < 0 is dat een opname uit
             de pot; bij 0 ≤ x < p een verlaagde storting. Het potsaldo rolt door naar
             de volgende maand. Is de pot ontoereikend, dan blijft het restant als
             negatief eindsaldo staan. De berekening is afgeleid — er wordt niets in de
             store weggeschreven.

CONSTRAINTS: Desktop-first bestaande layout, geen nieuwe kleuren of spacing buiten de
             bestaande umanex CSS-variabelen. Geen nieuwe dependencies. Rekenlogica in
             lib/cashflow/calculator.ts als enige bron — MonthCard en ReservationSection
             leiden af uit ReservationPotBalance, dupliceren geen buffer-math.
```

---

## Open vragen

_(leeg — alle kritische items beantwoord)_

## Aannames

- `[ASSUMPTION: component-typologie]` De buffer-markering wordt een toggle in het
  bestaande ReservationSidepanel, niet een nieuw scherm of modal — het is een eigenschap
  van een pot en hoort bij de andere pot-instellingen.
- `[ASSUMPTION: identificatie]` De buffer wordt herkend aan een expliciet veld
  `coversDeficit` op `ReservationItem`, niet aan het label "Buffer". Label-matching is
  fragiel (hernoemen breekt het stil) en talige koppeling hoort niet in de rekenkern.
- `[ASSUMPTION: verlaagde storting]` Wanneer E(0) ≥ 0 maar het normale eindsaldo E(p) < 0,
  wordt de storting verlaagd tot E(0) in plaats van een opname te doen. Volgt uit
  "eindsaldo landt op exact €0" en is prudent: je zet niets opzij wat je niet hebt.
- `[ASSUMPTION: exclusiviteit]` Maximaal één pot kan de buffer zijn; toggelen zet de
  vlag op andere potten uit. Meerdere buffers zouden de verdeling van een tekort
  ondefinieerd maken.
- `[ASSUMPTION: overschrijven]` In een maand met actieve opname is het bedragveld
  read-only — de waarde is volledig afgeleid. Zelfde patroon als het bestaande
  maandelijks-budget-veld in de huidige maand.
- `[ASSUMPTION: states]` Loading/error/empty zijn niet van toepassing: alles is
  synchroon uit een lokale Zustand-store, geen fetch. Wel relevante toestanden:
  geen buffer ingesteld, buffer zonder tekort, opname actief, pot ontoereikend.

## Acceptatie

- [ ] Een spaardoel kan als buffer gemarkeerd worden via ReservationSidepanel; markeren
      van een tweede pot heft de eerste op
- [ ] Zonder gemarkeerde buffer is het gedrag van de app ongewijzigd
- [ ] Maand met negatief eindsaldo en toereikende pot → eindsaldo exact €0
- [ ] De buffer-opname verlaagt het potsaldo met exact het opgenomen bedrag, doorheen
      opeenvolgende maanden
- [ ] Pot ontoereikend → opname beperkt tot het potsaldo, eindsaldo blijft negatief,
      potsaldo landt op €0 (niet negatief)
- [ ] Maand zonder tekort → normale storting, geen opname, veld blijft bewerkbaar
- [ ] Negatieve buffer-waarde is zichtbaar in de rij én telt correct door in het
      "Provisies"-subtotaal (dat negatief mag worden) en de Uitgaves-tegel
- [ ] MonthCard-eindsaldo en calculator-eindsaldo blijven identiek (bestaande invariant)
- [ ] Maand 0 en toekomstige maanden geven hetzelfde resultaat voor dezelfde situatie
- [ ] Bestaande localStorage-data migreert zonder verlies (STORE_VERSION-bump)
- [ ] `pnpm --filter cashflow build` slaagt, geen TypeScript-fouten, geen `any`

## Beslissingsgeschiedenis

- 2026-08-03: Buffer is een échte spaarpot die aangroeit (niet een lege tegenboeking) —
  de opname put uit opgebouwd saldo en wordt daardoor begrensd door dat saldo.
- 2026-08-03: Trigger is een negatief **eindsaldo** (incl. startsaldo), niet elk negatief
  maandresultaat — het vrije saldo van de vorige maand wordt eerst opgebruikt.
- 2026-08-03: Bij ontoereikende pot wordt de opname beperkt tot het potsaldo; het restant
  blijft zichtbaar rood in plaats van de pot negatief te laten gaan.
