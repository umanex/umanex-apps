# Datavisualisatie op het ritdetail — hartslagverloop en splits per 500 m

- **Datum:** 2026-09-16
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gepland

---

```
TASK:        Twee grafieken op het ritdetail: het hartslagverloop over de rit, en de
             500 m-splits als afwijking van het ritgemiddelde.

CONTEXT:     app/(tabs)/history/[id].tsx toont vandaag alleen tabellen. De data ligt er
             al: workouts.samples is een 1 Hz-reeks [t, d, hr] (gemeten: 21 van 22 ritten
             dragen hem, langste 3 601 punten) en lib/workoutSegments.ts levert
             segmentSplitTimes, distanceSplits en segmentHeartRates. Er is nog géén
             tekenlaag in de app. Ontworpen door Jeroen in Figma op 2026-09-16.

ELEMENTS:    Sectie HARTSLAG — lijnpad, stippellijn op het gemiddelde ("gem. 149"),
             pieklabel ("167"), tijdas links/rechts ("0:00" / "60:00"), en in de
             uitgelezen vorm: verticale markeerlijn, punt op de curve, waardebubbel
             ("139 bpm" boven "46:40").
             Sectie SPLITS PER 500 M — staafjes rond een nullijn (= ritgemiddelde),
             omhoog = trager, omlaag = sneller, voetregel "gem. 2:14 /500m — hoger is
             trager".

BEHAVIOUR:   Beide secties staan inline op het detailscherm, onder de bestaande
             tabellen, en scrollen mee. De hartslagsectie kent een uitleespunt: de
             gebruiker wijst een moment aan en leest daar bpm en tijd af. De
             splitssectie is niet aanwijsbaar in de studie.

CONSTRAINTS: Volle breedte (430), elke sectie 431 hoog, 20 padding links/rechts.
             Albert Sans Medium 10 voor de sectiekoppen, Light 10 voor waarden en as,
             Medium 16 voor het bubbelgetal. Kleuren uitsluitend uit de rollaag —
             elke kleur in de studie is aan een variabele gebonden. Rood markeert
             "trager dan gemiddeld" en de hartslaglijn; grijs is "sneller". Geen
             hardcoded hex, geen losse pixelwaarde die geen token is.
```

---

## Figma

| | |
|---|---|
| Bestand | `T1bGrvIzSNeLyh5CbarATZ` — *RowTrack - Design*, pagina **Screens v2** |
| Rusttoestand | [`474:1504`](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack-Design?node-id=474-1504) — *Analyse — studie / Rust* |
| Uitgelezen | [`474:1505`](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack-Design?node-id=474-1505) — *Analyse — studie / Uitgelezen* |

Beide frames zijn **handwerk**: ze dragen geen `bouwhash` en geen `scherm`/`frame`-pluginData, dus de
builder raakt ze niet aan en `parity` meet ze niet. Ze stonden tot 2026-09-16 op x = 11 974 en 12 452 —
precies op de plek waar de eerstvolgende herbouw `ProfileScreen/Playground` en `/Onvolledig` neerzet — en
zijn die dag naar x = 20 000 en 20 478 verplaatst. Dat is een aanname met een houdbaarheidsdatum: de
builder plaatst frame *i* op `i × 478`, dus bij ongeveer veertien frames erbij staan ze weer in de weg.

## Wat er al ligt

| | |
|---|---|
| Data | `workouts.samples` — `[t, d]` of `[t, d, hr]` per seconde. Gemeten 2026-09-16 op productie: 21 van 22 ritten dragen samples, 21 van 22 een hartslag, langste reeks 3 601 punten. |
| Afgeleiden | `lib/workoutSegments.ts`: `segmentSplitTimes(samples, 500)`, `distanceSplits`, `segmentHeartRates`, `averageSplit`, `fastestSplit` — allemaal puur en al in gebruik op het detailscherm. |
| Tekenlaag | **ontbreekt.** Geen `react-native-svg`, geen Skia, geen chart-library. Dit is een dependency-beslissing die vooraf bevestigd moet worden (CLAUDE.md → acties die altijd eerst bevestigd moeten worden) en op iOS een native rebuild vraagt. |
| Backlog | `2026-09-07 — UX-audit P2: geen datavisualisatie (HR-verloop, split-trend)`, status open. Deze briefing is de eerste zet daarvan. |

## Open vragen

1. **Interactie-modaliteit van het uitleespunt.** De studie toont de uitgelezen toestand, niet hoe je
   erin komt. Tik, sleep over de grafiek, of lang indrukken? En hoe kom je eruit — loslaten, of blijft de
   laatste waarde staan? Bepaalt of de grafiek een `PanResponder`/gesture nodig heeft of alleen een tik.
2. **Meer dan 26 splits.** De studie tekent 26 staafjes van 13 px met 2 px ertussen, en dat is exact de
   langste rit in de database (13 405 m = 26 splits, gemeten 2026-09-16). Een rit van 20 km heeft er 40 en
   past niet. Smaller worden, horizontaal scrollen, samenvoegen per kilometer, of afkappen met een teken?
3. **Welke states vallen af?** Loading, leeg en fout zijn per `CLAUDE.md` aanwezig tenzij de briefing ze
   uitsluit. Kandidaten die hier echt voorkomen: geen samples (1 van 22 ritten), geen hartslag (idem — en
   sinds PR umanex-apps#496 kan dat óók door een geweigerde toestemming), rit korter dan 500 m (geen
   splits). Verbergt de sectie zich dan, of toont hij een lege vorm met uitleg?
4. **Hoort dit ook op Home?** Het backlog-item noemt "een mini-trend op Home". De studie doet daar geen
   uitspraak over; deze briefing beperkt zich tot het detailscherm tenzij anders beslist.

## Aannames

- `[ASSUMPTION: de secties staan onder de bestaande tabellen op het detailscherm en scrollen mee — de studieframes zijn 430 breed en 431 hoog, dus halve schermhoogte, wat op een inline sectie wijst en niet op een eigen scherm]`
- `[ASSUMPTION: de nullijn in de splitsgrafiek is het ritgemiddelde, niet een doel — de laagnaam zegt "nullijn = ritgemiddelde" en de voetregel noemt "gem. 2:14 /500m"]`
- `[ASSUMPTION: rood/grijs dragen betekenis (trager/sneller) en geen merkkleur; de kleurrol moet dus semantisch zijn, niet `accent`]`
- `[ASSUMPTION: de hartslaglijn is één pad zonder zones — de studie toont geen zonebanden, terwijl het backlog-item "HR-over-tijd met zones" noemt. Zones zijn dus geschrapt of nog niet getekend]`

## Acceptatie

- [ ] **Component-typologie** — twee inline secties op `app/(tabs)/history/[id].tsx`, onder de bestaande tabellen; geen modal, geen sheet, geen eigen route.
- [ ] De hartslagsectie toont lijnpad, gemiddelde-stippellijn, pieklabel en een tijdas met begin en eind.
- [ ] De splitssectie toont staafjes rond een nullijn, omhoog trager en omlaag sneller, met de voetregel eronder.
- [ ] **States** — vastgelegd welke van loading, leeg en fout van toepassing zijn; elke as die afvalt staat hier áfgeschreven met reden, niet weggelaten.
- [ ] Een rit zonder samples toont geen halve grafiek (gemeten: 1 van 22 ritten).
- [ ] Een rit zonder hartslag toont de splitssectie wél en de hartslagsectie niet — of de afgesproken lege vorm.
- [ ] **Interactie** — het uitleespunt werkt zoals in open vraag 1 beslist, en is met één hand te bedienen.
- [ ] **Edge case** — een rit met meer dan 26 splits rendert volgens de regel uit open vraag 2; toetsbaar met een synthetische rit van 20 km.
- [ ] **Edge case** — een rit korter dan 500 m levert geen enkele staaf en geen lege as.
- [ ] Geen hardcoded kleur of maat: elke kleur komt uit `@/constants`, elke afstand uit `space`/`radii`.
- [ ] De dependency voor de tekenlaag is vooraf bevestigd en, op iOS, met een native rebuild geverifieerd.
- [ ] Beeldvergelijking tegen de Figma-studie op de twee toestanden — of `[NIET TE VERIFIËREN — reden]` wanneer de studieframes geen bouwdata dragen en dus buiten `parity`/`beeld` vallen.

## Beslissingsgeschiedenis

- 2026-09-16: aangemaakt naar aanleiding van twee handgemaakte studieframes die tijdens de Figma-sync-ronde
  op *Screens v2* werden aangetroffen. Ze lagen op de plek waar de builder `ProfileScreen` neerzet en zijn
  op verzoek van Jeroen naar rechts verplaatst (x = 20 000 / 20 478) in plaats van naar een eigen pagina.
