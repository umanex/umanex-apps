# TC-EBC — Analyse-laag (HR-verloop, split-trend)

- **Datum:** 2026-09-14
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gebouwd

---

```
TASK:        De opgeslagen `samples` zichtbaar maken: hoe de hartslag door een rit liep, en
             hoe het tempo per 500 m verschilde.

CONTEXT:     UX-audit 2026-07-16 F11 / R6, via BACKLOG-item 2026-09-07. RowTrack bewaart per
             rit een tijdreeks maar toont er nul beeld van; BPM gem/piek is alles wat er
             van over blijft. De audit noemt dit het grootste utility-gat van een
             data-product. Gemeten op de productiedatabase (2026-09-14, read-only):
             22 ritten · 21 met samples · reeksen van 1289 tot 3601 punten (gem. 2700) ·
             18 van 22 dragen hartslag per sample · afstanden 4 269–13 405 m, dus
             8 tot 26 staafjes van 500 m. Referentierit voor het ontwerp:
             11 sept, 13 405 m in 60 min, hartslag 87→167 met twee dips, splits 131–144 s.

ELEMENTS:    Een grafiek-component in `components/data-display/`, plus de plek waar hij
             landt: het workout-detailscherm (`app/(tabs)/history/[id].tsx`). De mini-trend
             op Home staat in de audit maar valt buiten deze briefing tot de eerste twee
             staan.

BEHAVIOUR:   De grafiek toont de vorm van de rit in één blik. Daarnaast is hij UITLEESBAAR:
             een vinger op de grafiek toont de waarde op dat punt, met een markeerlijn en
             een waarde-bubbel. Dat zijn twee visuele toestanden — rust en uitgelezen — en
             beide horen in Figma te staan vóór er code komt.

CONSTRAINTS: Alleen rollen uit de tokenlaag; geen rauwe kleur of maat. 390 px bruikbare
             breedte op een toestel. De reeks moet omlaag gesampled worden vóór hij
             getekend wordt: 2 700 punten op ~350 px is ruim zeven punten per pixel.
             Figma beslist, code bewaart — het ontwerp gaat door de bestaande keten
             (frame, `figma:spec`, beeld-basislijn), dus het component krijgt een story.
```

---

## Open vragen

Vier kritische items, geen ervan af te leiden uit de bron:

1. **Component-typologie.** Eén grafiek-component met een variant-as (lijn / staaf), of twee
   losse componenten? Dat bepaalt of ze één Figma-pagina delen en of de variant-as in de
   story-argTypes hoort.
3. **States.** Welke vallen af? `empty` is niet theoretisch: 3 van de 22 ritten dragen geen
   hartslag per sample, dus het HR-beeld heeft een lege vorm nodig. `loading` hangt aan het
   detailscherm dat de rit al ophaalt; `error` idem.
4. **Edge cases.** Bij 26 staafjes blijft er ~13 px per staaf over. Groeperen we boven een
   grens naar 1 000 m, of laten we ze smaller worden?
(De nullijn-vraag die uit de echte data kwam, is beantwoord — zie Beslissingsgeschiedenis.)

De tekenlaag is bewust nog niet gekozen: het ontwerp beslist erover, niet andersom. Zie
Beslissingsgeschiedenis.

## Aannames

- `[ASSUMPTION]` De analyse-laag begint op het workout-detailscherm en niet op Home: daar
  staat de data van één rit al, en de mini-trend op Home vraagt een tweede aggregatie over
  meerdere ritten.
- `[ASSUMPTION]` De hartslagzones uit de audit (kleurbanden achter de lijn) volgen de
  bestaande `PaceZone`-gedachte, maar er bestaat vandaag geen HR-zone-rol in de tokens. Die
  moet erbij, in beide mode-sets — en dat is een Tokens Studio-actie, geen code-actie.

## Acceptatie

Deze ronde levert een ONTWERP, geen code. De items hieronder gaan daarover; de bouw-items
komen erbij zodra de tekenlaag gekozen is.

- [x] Twee frames op Screens v2, rust én uitgelezen — bewijs: `Analyse — studie / Rust` (474:1504)
      en `Analyse — studie / Uitgelezen` (474:1505), beide 430×431, teruggelezen via
      `figma_capture_screenshot` (runtime, niet REST — een verse edit is in REST per definitie stale)
- [x] Het ontwerp is getekend op de reeks van een ECHTE rit — bewijs: rit
      `ba841703-c883-49f1-9943-92d70a4e5c53` (11 sept, 13 405 m), 91 punten uit de 3 601 samples,
      splits 131–144 s, opgehaald met een read-only `select` op de productiedatabase
- [x] Geen rauwe kleur — bewijs: alle verf in beide frames doorlopen, **81 gebonden aan een
      tokenrol, 0 ongebonden**
- [x] Component-typologie: twee aparte componenten, geen variant-as — bewijs: in het frame heeft
      de lijn een y-as van 80–175 bpm over 168 px en 91 punten, de staven een y-as op het
      ritgemiddelde met 26 rechthoeken van 13,08 px; geen gedeelde maat, as of interactie, dus
      een variant-as zou twee dingen samenvoegen die alleen een naam delen
- [x] Edge case 26 staafjes — bewijs: 13,08 px per staaf gemeten in het frame op ware grootte, en
      de vorm blijft leesbaar; geen groepering naar 1 000 m nodig
- [ ] States: `empty` (3 van 22 ritten dragen geen hartslag per sample) is nog niet ontworpen
- [ ] De downsampling is gemeten op het toestel, niet geschat — dat hoort bij de bouwronde
- [ ] De tekenlaag-beslissing staat in Beslissingsgeschiedenis, met wat hij kost
- [ ] Geen rauwe kleur of maat — `pnpm --filter @umanex/tokens guard` groen
- [ ] Het component heeft een story, een Figma-frame en een beeld-basislijn op beide platformen
- [ ] De downsampling is gemeten, niet geschat: een reeks van 3 601 punten rendert zonder
      zichtbare vertraging en de getekende vorm wijkt niet af van de volledige reeks

## Beslissingsgeschiedenis

- 2026-09-14: briefing geopend. Scope bewust beperkt tot het detailscherm; de mini-trend op
  Home uit R6 wacht tot de eerste twee grafieken staan.
- 2026-09-14: **interactie = uitleesbaar** (Jeroen). Slepen toont de waarde op dat punt, met
  markeerlijn en waarde-bubbel. Gevolg: twee visuele toestanden in plaats van één, en een
  gesture-laag in de bouwronde.
- 2026-09-14: **nullijn van de staafjes = het ritgemiddelde** (Jeroen). Staven gaan omhoog bij
  trager en omlaag bij sneller. Deze vraag bestond niet vóór de data gemeten was: de 26 splits
  van de referentierit liggen tussen 131 en 144 s, dus vanaf nul getekend zijn het 26 gelijke
  staven en laat de grafiek juist niet zien wat er gebeurde. Gevolg voor het ontwerp: de
  gemiddelde-lijn is zelf een element met een label, en "hoog" betekent hier traag — dat vraagt
  een leesrichting die het scherm moet uitleggen.
- 2026-09-14: **tekenlaag nog niet gekozen** (Jeroen) — eerst het Figma-ontwerp, dan de
  techniek die dat ontwerp nodig blijkt te hebben. De staafjes kunnen per meting zonder
  dependency (een rij Views met een hoogte); een vloeiende lijn niet. Die afweging wordt pas
  eerlijk als de vorm er ligt.
- 2026-09-14: **het ontwerp heeft die vraag beantwoord.** De hartslaglijn is één pad over 91
  punten; dat is met Views niet te bouwen, ook niet benaderend. De staven zijn 26 rechthoeken en
  hebben niets nodig. Het ontwerp splitst dus in twee componenten met twee verschillende kosten:
  `SplitBars` kan vandaag, `HeartRateChart` vraagt een tekenlaag én een native herbouw. Dat is
  geen compromis maar wat er staat — en het maakt een ronde mogelijk die meteen iets oplevert.
- 2026-09-14: **twee componenten, geen variant-as** — volgt uit het ontwerp. Ze delen geen maat,
  geen as en geen interactie; één component met een `soort`-prop zou twee dingen in één doos
  stoppen die alleen een naam gemeen hebben.
