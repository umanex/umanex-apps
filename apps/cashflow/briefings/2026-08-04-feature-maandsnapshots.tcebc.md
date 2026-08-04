# Maandsnapshots en navigatie

- **Datum:** 2026-08-04
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** in schijven — schijf 1 (navigatie) gebouwd en gevalideerd

---

```
TASK:        Een afgesloten maand wordt bevroren tot een onveranderlijk snapshot, en het
             3-maandenvenster wordt navigeerbaar zodat je die maanden terug kunt zien.

CONTEXT:     Fase 3 van 2026-08-04-plan-advies-implementatie.md. Vandaag bestaat het
             verleden niet: de ankermaand is altijd de huidige maand en `setAnchorMonth`
             wordt nergens aangeroepen. Zonder afgesloten maanden is er geen
             begroot-vs-werkelijk, geen trend en niets om te plotten in fase 4.

ELEMENTS:    Navigatieknoppen naast de venstertitel, actie "Maand afsluiten" in de
             maandheader, vergrendelde maandkolom met eigen achtergrond, per regel een
             begroot- naast een werkelijk-bedrag, actie om een afsluiting op te heffen.

BEHAVIOUR:   Het venster schuift per maand vooruit en terug. Afsluiten bevriest de
             maand: de kolom leest vanaf dan uit het snapshot en is niet meer bewerkbaar.
             De maand erna vertrekt van het bevroren eindsaldo in plaats van van een
             herberekening.

CONSTRAINTS: Een afgesloten maand wordt nooit opnieuw doorgerekend uit actuele stamdata —
             dat is het anti-patroon waar beide adviesrapporten expliciet voor
             waarschuwen. Snapshots gaan in de bestaande Zustand-store (localStorage),
             dus store-versie omhoog en migrate uitbreiden.
```

---

## Open vragen

Alle vier beantwoord op 2026-08-04:

1. **Afsluitmoment** — automatisch bij de maandwissel. Met één rail erbij: het afsluiten
   geldt alleen voor de maand die net voorbij is, niet met terugwerkende kracht. Zou de app
   bij de eerste start alle oudere maanden bevriezen, dan legt hij een herberekening vast
   als historie — precies het anti-patroon dat snapshots moeten voorkomen. Oudere maanden
   krijgen een expliciete afsluitknop.
2. **Correctie** — heropenen laat het snapshot vervallen; de maand rekent weer live mee en
   kan daarna opnieuw afgesloten worden. Heropenen zet een vlag, anders sluit de maand zich
   meteen weer automatisch.
3. **Weergave** — dezelfde ledger, vergrendeld.
4. **Navigatiebereik** — terug tot de vroegste maand met gegevens, vooruit onbeperkt.

## Schijven

- **Schijf 1 — navigatie.** Gebouwd. Het venster schuift per maand, met een ondergrens op
  de vroegste maand met gegevens en een "Vandaag"-knop zodra je elders zit. Elke voorbije
  maand zonder snapshot draagt het label *reconstructie*.
- **Schijf 2 — snapshots.** Store-uitbreiding, automatisch afsluiten van de voorbije maand,
  vergrendelde weergave, en `computeAnchorState` dat van het meest recente snapshot
  vertrekt.
- **Schijf 3 — begroot naast werkelijk** in de vergrendelde maand.

## Aannames

- `[ASSUMPTION]` Het snapshot bevat het beginsaldo, het eindsaldo, de vijf subtotalen, de
  gereserveerde en de bufferstand, plus de regels zoals ze op dat moment stonden.
- `[ASSUMPTION]` Begroot-vs-werkelijk is alleen betekenisvol waar het model twee bedragen
  kent: vaste uitgaven (`amount` versus `settlement.actualAmount`) en potstortingen
  (`monthlyAmount` versus `settlement.effectiveAmount`). Voor eenmalige posten en
  inkomsten is er één bedrag; daar is "werkelijk" de betaald/ontvangen-vlag.
- `[ASSUMPTION]` `computeAnchorState` vertrekt voortaan van het meest recente snapshot in
  plaats van vanaf `referenceMonth` vooruit te rekenen. Dat maakt het beginsaldo
  betrouwbaarder én de berekening korter, maar het raakt de kern van de calculator.
- `[ASSUMPTION]` Alleen maanden vóór de huidige maand kunnen afgesloten worden.
- `[ASSUMPTION]` De ankermaand blijft bij het opstarten de huidige maand; navigatie is een
  sessie-toestand die niet gepersisteerd wordt.

## Acceptatie

- [x] Het venster schuift een maand vooruit en terug, met de huidige maand als vertrekpunt.
      Visueel gevalideerd: terug tot april (vroegste gegevens) schakelt de terugknop uit en
      toont "Vandaag" zodra je elders staat.
- [x] Een voorbije maand zonder snapshot is als reconstructie herkenbaar. Zichtbaar
      gemaakt omdat navigatie anders misleidt: april toonde het referentiesaldo van
      augustus als beginsaldo, en dezelfde maand levert een ander eindsaldo naargelang waar
      het venster begint (augustus: € 4.170,00 als ankermaand, € 4.670,00 als derde kolom).
      Schijf 2 lost dat op; tot dan is het gemarkeerd in plaats van verzwegen.
- [ ] Een maand afsluiten bevriest beginsaldo, eindsaldo, subtotalen, gereserveerd en
      buffer in een snapshot.
- [ ] Een afgesloten maand toont exact het snapshot, ook nadat stamdata wijzigt: een
      hernoemde categorie of een gewijzigd maandbedrag verandert de historie niet.
- [ ] Een afgesloten maand is niet bewerkbaar en is als zodanig herkenbaar.
- [ ] De maand ná een afgesloten maand vertrekt van het bevroren eindsaldo.
- [ ] Waar het model twee bedragen kent, toont de afgesloten maand begroot naast werkelijk.
- [ ] Een afsluiting kan opgeheven worden; daarna rekent de maand weer live mee.
- [ ] De store-migratie laat bestaande data intact — geen snapshots betekent gedrag als
      vandaag.
- [ ] `buffer-scenarios.ts` blijft groen en de baseline verschuift alleen waar snapshots
      in het spel zijn.

## Beslissingsgeschiedenis

- 2026-08-04: aangemaakt als fase 3. Fase 2 leverde alleen "herhaal vorige maand"; de
  CSV-import is geschrapt en kan hier terugkomen zodra historiek bestaat.
