# TC-EBC — Foutpad: geen faaltoestand mag als geldige toestand renderen

- **Datum:** 2026-09-14
- **Type:** flow
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gepland
- **Bron:** designreview 2026-09-14, bevindingen `ble-herstel`, `profiel-leesfout`, `doel-deling` + foutpreventie

---

```
TASK:        Elke faaltoestand in de app zichtbaar maken als faaltoestand — in plaats van als
             een leeg, nul of voltooid scherm dat er geldig uitziet.

CONTEXT:     Designreview 2026-09-14. Vijf van de tien Nielsen-heuristieken staan op 1 en ze
             hangen alle vijf hier: foutherstel, foutpreventie, controle en vrijheid,
             consistentie, zichtbaarheid van status. Drie gemeten instanties van dezelfde
             faalklasse: (1) bij verbindingsverlies midden in een rit wist het active-scherm
             álle meetwaarden en is `Opnieuw proberen` platte grijze tekst met minder contrast
             dan de foutmelding erboven, terwijl `Stop training` een volle rode pil met glow is;
             (2) `app/(tabs)/profile.tsx:183` leest de `error` niet, waardoor een gefaalde lees
             rendert als een leeg profiel én `spm_halved` stil op `false` zet — de schakelaar
             die de SPM-weergavecorrectie aanstuurt; (3) `lib/workout-goals.ts:128,133` en
             `lib/hooks/usePeriodGoal.ts:145` delen door `target` zonder guard, dus een nul-doel
             leest als "100%, bereikt". Dezelfde klasse is eerder geraakt en gerepareerd voor
             `usePeriodGoal` (HANDOFF F6) en nooit elders nagelopen.

ELEMENTS:    ConnectionOverlay (`components/workout/`) · ActivePhase · StartCta (`IdlePhase`) ·
             ProfileScreen (`app/(tabs)/profile.tsx`) · `lib/workout-goals.ts` ·
             `lib/hooks/usePeriodGoal.ts` · ErrorState / ErrorMessage (bestaand, feedback-laag).

BEHAVIOUR:   Bij verbindingsverlies PAUZEERT de rit. Tijd, afstand en laatste split blijven
             zichtbaar op verlaagde dekking, bevroren op hun laatste waarde, met het woord
             "gepauzeerd" erbij — anders leest een bevroren klok als een lopende. De
             herstelactie is de primaire gevulde knop, de stopactie een tekstknop. De melding
             noemt het toestel bij naam. Bij herstel hervat de rit vanaf de bevroren stand.
             Start is niet aanroepbaar zolang de roeitrainer niet verbonden is, en zegt waarom.
             Een gefaalde lees toont een fout met een herstelactie, nooit een lege waarde. Een
             doel van nul rendert als "geen doel", nooit als 100%.

CONSTRAINTS: Alleen rollen uit de tokenlaag; geen rauwe kleur of maat. De app heeft geen eigen
             foutkleur — accentrood is bezet door de primaire actie — dus de foutkleur komt er
             als nieuwe rol in béide mode-sets bij, of de fout wordt zonder kleur gedragen.
             Portrait én landscape op het active-scherm. De handen van de gebruiker zitten aan de
             handle: raakvlakken minstens 44 pt, geen precisiewerk. Elke zichtbare wijziging gaat
             door de Figma-keten (frame, `figma:spec`, beeld-basislijn).
```

---

## Open vragen

Geen. De twee die er waren zijn op 2026-09-14 beantwoord.

**Beantwoord — de rit pauzeert bij verbindingsverlies.** Keuze van Jeroen, 2026-09-14. Dat lost
tegelijk het risico op uit `BACKLOG 2026-09-07 — Best-2000m: BLE-reconnect midden in workout
re-baselinet niet`: pauzeren betekent dat er geen meetwaarden binnenkomen die na een reconnect
negatief kunnen worden. **Let op de consequentie die uit de keuze volgt en niet uit de bevinding:**
een bevroren klok en een lopende klok zien er identiek uit. Het scherm moet dus zeggen dát hij
pauzeert, anders ruilt deze fix één stille leugen ("de rit loopt door") voor een andere.

**Beantwoord — de fouttoestand wordt een overlay over het levende scherm** (optie a uit de drie
die hier stonden), met de waarden eronder op verlaagde dekking. Dit volgt uit de pauzekeuze:
bevroren waarden hebben alleen betekenis als je ze ziet. Afgeleid, niet expliciet gevraagd — zeg
het als je liever een banner wilt, dan verschuift alleen de vorm, niet de acceptatielijst.

De andere twee kritische items waren al beantwoord:

- **States.** Aanwezig: `connecting` (herstel bezig), `error` (verbinding verloren), `degraded`
  (roeitrainer verbonden, hartslagband niet). Afgeschreven: `empty` — er is midden in een rit
  geen lege toestand; en `success` krijgt geen eigen scherm, de terugkeer naar de normale weergave
  ís de bevestiging.
- **Interactie-modaliteit.** Alleen tik. Geen swipe, geen long-press, geen gebaar dat twee handen
  vraagt. De gebruiker zit vast aan de handle; dat is de reden, niet de conventie.

## Aannames

- `[ASSUMPTION]` De foutkleur wordt een nieuwe rol in `Theme/light` én `Theme/dark`. De build
  faalt op asymmetrie, dus half toevoegen kan niet. Als je liever geen nieuwe rol wilt, draagt de
  fout zijn betekenis via vorm en tekst — dan vervalt het kleur-acceptatie-item en komt er één
  bij over de vorm.
- `[ASSUMPTION]` "Roeitrainer niet verbonden" blokkeert Start; "hartslagband niet verbonden"
  blokkeert hem niet, want roeien zonder hartslag is een geldige sessie. Het bestaande frame
  *ActivePhase / Zonder Hartslagband* bevestigt dat die toestand voorzien is.
- `[ASSUMPTION]` De naam van het toestel is beschikbaar op het moment van de fout. Zo niet, dan
  is "Roeitrainer" / "Hartslagmeter" de terugval — dat zijn de labels die *IdlePhase / Niet
  Verbonden* al gebruikt.

## Acceptatie

Elk item één meting, bewijs in de regel.

- [ ] Bij `error` blijven tijd, afstand en laatste split leesbaar op het scherm — bewijs: `dev-active?ble=error`, `simctl io booted screenshot`, de drie waarden benoemd
- [ ] Het scherm zegt dat de rit gepauzeerd is — bewijs: de letterlijke tekst uit hetzelfde screenshot
- [ ] De tijd staat stil tijdens het verbindingsverlies — bewijs: twee screenshots met ≥30 s ertussen, dezelfde waarde
- [ ] Na herstel hervat de rit vanaf de bevroren stand en springt niet — bewijs: screenshot vóór en ná herstel, de waarde in beide genoemd
- [ ] De herstelactie is de enige gevulde knop op het foutscherm — bewijs: hetzelfde screenshot, aparte waarneming
- [ ] De stopactie is geen gevulde knop meer — bewijs: hetzelfde screenshot, aparte waarneming
- [ ] De foutmelding noemt het toestel bij naam — bewijs: de letterlijke tekst uit het screenshot
- [ ] Beide knoppen halen 44 pt in beide richtingen — bewijs: gemeten op de node, niet afgeleid uit de style
- [ ] `Start` is niet aanroepbaar zonder verbonden roeitrainer — bewijs: Maestro-flow tikt op Start in de niet-verbonden toestand, assert dat het active-scherm niet opent
- [ ] `Start` zegt waarom hij niet kan — bewijs: de letterlijke tekst uit het screenshot van diezelfde toestand
- [ ] Een gefaalde profiellees toont een fout in plaats van lege velden — bewijs: lees geforceerd laten falen, screenshot
- [ ] Een gefaalde profiellees laat `spm_halved` niet stil op `false` vallen — bewijs: node:test op de leesfunctie, aparte assertie van het vorige item
- [ ] `loading` blijft niet eeuwig staan wanneer er geen user is — bewijs: node:test op het `!user`-pad
- [ ] `target = 0` rendert als "geen doel", niet als 100% — bewijs: node:test over alle vier de doeltypes in `workout-goals.ts`
- [ ] `usePeriodGoal` guardt dezelfde deling — bewijs: node:test met `target = 0` uit de DB-vorm
- [ ] De tegenproef is rood zonder de fix — bewijs: guard weghalen, suite moet omvallen; terugzetten, suite groen (tweezijdig)
- [ ] Portrait en landscape tonen dezelfde fouttoestand — bewijs: twee screenshots, apart benoemd
- [ ] Geen nieuwe ongebonden waarde — bewijs: `figma:check` binding-as, aantal vergeleken met de stand vóór (50 op 2026-09-14)
- [ ] `figma:check` blijft groen op alle zestien assen — bewijs: exit-code plus het aantal assen uit de uitvoer
- [ ] De beeld-as blijft binnen zijn vloer op `overig` — bewijs: `pnpm --filter rowtrack beeld`, per frame de ontleding, niet de som van `grof`

## Beslissingsgeschiedenis

- 2026-09-14: aangemaakt uit de designreview van dezelfde dag. Drie bevindingen samengevoegd tot
  één flow omdat ze één faalklasse delen — een faaltoestand die als geldige toestand rendert —
  en dus één acceptatie-as hebben. Los gebouwd zouden ze drie keer dezelfde afweging overdoen.
- 2026-09-14: de vraag "telt de rit door tijdens verbindingsverlies" is bewust aan de
  component-typologie gekoppeld in plaats van als losse aanname genoteerd; het open BACKLOG-item
  over reconnect-baselining maakt er een meetbare, niet een cosmetische keuze van.
- 2026-09-14: **de rit pauzeert** (keuze Jeroen). Daaruit volgt de fouttoestand als overlay over
  het levende scherm, en drie nieuwe acceptatie-items: het scherm zegt dát hij pauzeert, de tijd
  staat aantoonbaar stil, en hervatten springt niet. Die eerste is er omdat de pauzekeuze een
  eigen faalvorm meebrengt — een bevroren klok is van een lopende niet te onderscheiden.
