# TC-EBC — Split naar voren, het eindscherm gevuld, de Figma-bron recht

- **Datum:** 2026-09-14
- **Type:** screen
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gepland
- **Bron:** designreview 2026-09-14, bevindingen `split-niet-held`, `eindscherm-leeg`, `historiek-maandag`, `verwijderknop`, `balk-twee-betekenissen`, `icoon-only-doelen`, `figma-drift`

---

```
TASK:        De drie schermen die een roeier het vaakst ziet hun eigen hiërarchie geven — en de
             Figma-bron die ze beschrijft weer betrouwbaar maken.

CONTEXT:     Designreview 2026-09-14. Het oordeel over design-specificiteit was: de app weet wat
             roeien is, maar heeft die kennis niet naar de hiërarchie doorgetrokken. Concreet:
             het active-scherm zet een aftelklok als held en daaronder zes gelijkwaardige rijen
             waarin `Split /500m` evenveel gewicht krijgt als `Totale kcal` — zes is boven de vier
             die iemand tegelijk vasthoudt, momentane en cumulatieve waarden staan ongescheiden,
             en `Tijd` verspringt van rij 2 (split-doel) naar rij 5 (afstand-doel), zodat wie op
             positie leest de verkeerde waarde leest. De samenvatting is ~290 van 932 px leeg op
             precies het peak-end-moment. Historiek toont op maandag vier nullen en "Geen
             trainingen in deze periode" terwijl Home op datzelfde moment "GISTEREN — 12.715 m"
             toont. Op WorkoutDetail dekt de niet-scrollende knop `Training verwijderen` op drie
             tabs content af, waaronder de rij `3000M`.

             En de bron zelf klopt niet meer: vier framesparen op `Screens v2` overlappen, drie
             ervan volledig (430×932) — *LoginScreen / Met Fout*, *RegisterScreen / Met Fout* en
             *ForgotPasswordScreen / Met Fout* liggen onzichtbaar onder een ander frame. De
             TabBar-component staat op nul van de 30 v2-frames terwijl hij op de oude pagina
             *Screens* vijf keer hangt, en er is geen Home-frame in v2 terwijl Home de landings-
             tab van de app is. Zolang de bron dat mist, is er geen frame waarin de afgebroken
             HISTORIEK-tab zichtbaar had kunnen zijn.

ELEMENTS:    ActivePhase + StatsTable + HeroPanel + ProgressBar (`components/workout/active/`) ·
             SummaryKpiBand + SummaryTitle · HistoryScreen (`app/(tabs)/history/index.tsx`) ·
             WorkoutDetailScreen (`app/(tabs)/history/[id].tsx`) · een NIEUW grafiek-component
             (zie Aannames — hij bestaat nog niet in code) · Figma `Screens v2`.

BEHAVIOUR:   Het active-scherm toont twee blokken in plaats van één lijst: wat nú gebeurt
             (split, SPM, BPM) en wat er in totaal staat (afstand, kcal, watt), met een echte
             scheiding ertussen. De rijvolgorde ligt vast over alle doelmodi. Is er geen
             tijdsdoel, dan is split de held. De samenvatting toont onder de KPI-band het
             verloop van de rit en één regel vergelijking met de vorige rit. De verwijderactie
             verlaat de vaste onderkant. Historiek valt terug op een periode mét data en biedt in
             de lege toestand één actie aan.

CONSTRAINTS: Alleen rollen uit de tokenlaag; geen rauwe kleur of maat. 390 px bruikbare breedte.
             Portrait én landscape op het active-scherm — in landscape is de balk nu een
             verticale scheiding die als rand leest. De gebruiker roeit: raakvlakken ≥ 44 pt,
             leesbaar op een meter afstand, geen precisiewerk. Elke zichtbare wijziging gaat door
             de Figma-keten (frame, `figma:spec`, beeld-basislijn). De Figma-reparatie gaat
             vóór de schermwijzigingen, niet erna — anders bouw je op een bron waarvan drie
             frames onzichtbaar zijn.
```

---

## Open vragen

Geen. Alle vier de kritische items zijn op 2026-09-14 beantwoord.

**Beantwoord — de metrieken worden een 2×3-grid van tegels** (keuze Jeroen). Sneller af te lezen
in een oogopslag dan een lijst, wat past bij een gebruiker die tussen halen door kijkt. **De
prijs staat in de keuze zelf en wordt daarom gemeten:** een grid kost meer verticale ruimte dan
zes rijen, en die ruimte komt van de held. Er staat hieronder dus een acceptatie-item dat de
held gróter moet zijn dan elke tegel — anders ruilt dit scherm zijn ene probleem (zes gelijke
rijen) voor het omgekeerde (zes gelijke tegels die de held verdringen).

Uit het grid volgt ook dat "nu" en "totaal" niet meer door een scheidingslijn te onderscheiden
zijn maar door plaatsing: bovenste rij is wat nú gebeurt, onderste rij is het totaal. Die
volgorde ligt vast over alle doelmodi — dat is hetzelfde acceptatie-item als eerst.

**Beantwoord — de splitgrafiek groepeert boven een grens** (keuze Jeroen). Zie Aannames voor de
grens en de rekensom; die is mijn invulling, niet die van Jeroen.

**Beantwoord — de verwijderactie gaat naar een overflow-menu in de header.** Afgeleid uit mijn
eigen voorstel, niet expliciet gevraagd. Het haalt de destructieve actie weg van ooghoogte én
lost het afdekken op; de goedkopere variant (onderaan de scroll-inhoud meescrollen) lost alleen
het afdekken op. Zeg het als je de goedkope variant wilt.

Het vierde kritische item was al beantwoord:

- **States.** Aanwezig op de samenvatting: `met PR` en `zonder PR` (Home toont een "3 RECORDS"-
  badge, dus het mechanisme bestaat); op de grafiek `met hartslag` en `zonder hartslag` — dat is
  niet theoretisch, 3 van de 22 ritten in de productiedatabase dragen geen hartslag per sample.
  Op Historiek: `leeg` krijgt een actie in plaats van vier nullen. Afgeschreven: `loading` en
  `error` op deze schermen zijn al aanwezig en blijven ongewijzigd (8 van 9 schermen zijn
  compleet; de uitzondering `profile.tsx` hoort bij de foutpad-briefing, niet hier).

- **Interactie-modaliteit.** Tik en verticale scroll. De grafiek krijgt een uitlees-interactie —
  vinger op de grafiek toont de waarde op dat punt — zoals de analyse-laag-briefing beschrijft.
  Geen swipe tussen tabs, geen drag.

## Aannames

- `[ASSUMPTION]` **De grafiek bestaat nog niet in code en moet gebouwd worden.** De briefing
  `2026-09-14-feature-analyse-laag.tcebc.md` staat op `origin/main` met Status **gebouwd**, maar
  haar eigen acceptatielijst staat op 5 afgevinkt tegen 6 open, en er is geen grafiek-component
  in de repo — er is zelfs geen `components/data-display/`-map. Wat er wél is: de frames
  *Analyse — studie / Rust* en */ Uitgelezen* in Figma. Meest waarschijnlijke verklaring:
  "gebouwd" slaat op de Figma-kant. **Test vóór je begint:**
  `git ls-files 'apps/rowtrack/components/data-display/*'` — leeg bevestigt de aanname; een
  treffer weerlegt hem en dan is dit plaatsingswerk in plaats van bouwwerk.
- `[ASSUMPTION]` **De groepeergrens ligt op 20 staven.** Rekensom: ~350 px bruikbare breedte;
  bij 500 m geeft 13 405 m — de langste rit in de productiedatabase — 26 staven van ~13 px.
  Groeperen naar 1 000 m halveert dat naar 13 staven van ~27 px. Onder 20 staven (dus tot en met
  10 km) blijft 500 m staan, want dat is het interval waarin roeiers hun splits lezen; erboven
  wordt het 1 000 m. De grens is mijn invulling van "groeperen", niet Jeroens keuze — corrigeer
  hem als je liever op afstand grenst dan op aantal staven.
- `[ASSUMPTION]` De vergelijkingsregel op de samenvatting vergelijkt met de vorige rit, niet met
  het gemiddelde. Eén rit terug is de vergelijking die een roeier zelf maakt.
- `[ASSUMPTION]` De doeltype-kiezer krijgt labels bij alle vijf de opties. Let op: `BACKLOG` meldt
  dat een eerdere variant hierop (**F14**) is verworpen omdat vier labels niet naast elkaar passen
  op 430 px en elk segment al een `accessibilityLabel` draagt. Deze briefing stelt een ándere
  oplossing voor — minder zichtbare opties, de rest onder "meer" — maar als jij die afweging al
  gemaakt hebt, vervalt dit onderdeel en blijft alleen het kaartspeld-icoon over.

## Acceptatie

Elk item één meting, bewijs in de regel.

**Figma-bron eerst**

- [ ] Geen twee frames op `Screens v2` overlappen elkaar — bewijs: de overlap-meting opnieuw draaien via `figma_execute`, uitkomst nul paren
- [ ] Elk tab-dragend schermframe draagt een TabBar-instance — bewijs: telling per frame via `figma_execute`, op naam van de component, niet op een regex die `StatsTable` meevangt
- [ ] Er is een Home-frame op `Screens v2` — bewijs: de framelijst van de pagina
- [ ] Er is een frame voor de fouttoestand van het active-scherm — bewijs: de framelijst; dit sluit het gat uit de foutpad-briefing

**Active-scherm**

- [ ] De metrieken staan in een 2×3-grid van tegels — bewijs: `simctl` screenshot, rijen en kolommen geteld
- [ ] De bovenste rij draagt de momentane waarden, de onderste de cumulatieve — bewijs: hetzelfde screenshot, de zes labels op volgorde genoemd
- [ ] De held is groter dan elke tegel — bewijs: gemeten tekstgrootte van de held naast die van de grootste tegelwaarde, op de node
- [ ] Het grid duwt de held niet onder de vouw — bewijs: de y-positie van de onderkant van de held op het screenshot, tegen de schermhoogte
- [ ] De tegelvolgorde is gelijk over alle vier de doelmodi — bewijs: vier screenshots via `dev-active?goal=`, de positie van `Tijd` in elk genoemd
- [ ] Zonder tijdsdoel is split de grootste waarde op het scherm — bewijs: screenshot van de vrije modus, de gemeten tekstgrootte erbij
- [ ] In de vrije modus staat geen voortgangsbalk — bewijs: screenshot, aparte waarneming
- [ ] De statusvariant van de balk is aan zijn vorm te onderscheiden van de voortgangsvariant — bewijs: twee screenshots naast elkaar, het verschil benoemd
- [ ] Landscape toont dezelfde tweedeling — bewijs: screenshot in landscape. **Let op:** de review kon landscape niet meten (rotatie kwam niet door de simulator); lukt dat opnieuw niet, dan `[NIET TE VERIFIËREN — rotatie niet aanstuurbaar]` en niet een zachter item

**Samenvatting**

- [ ] Onder de KPI-band staat het verloop van de rit — bewijs: screenshot van `dev-active?summary=1`
- [ ] De lege ruimte onder de inhoud is kleiner dan 120 px — bewijs: gemeten op het screenshot
- [ ] Er staat één regel vergelijking met de vorige rit — bewijs: de letterlijke tekst uit het screenshot
- [ ] Met een PR toont de samenvatting die PR — bewijs: screenshot met gevulde `prEntries`
- [ ] Zonder hartslag rendert de grafiek een lege vorm en geen crash — bewijs: screenshot op een rit zonder hartslag per sample
- [ ] `Ga verder` noemt zijn bestemming — bewijs: de letterlijke tekst

**Historiek en detail**

- [ ] Historiek toont bij een lege periode één actie — bewijs: screenshot van de lege toestand
- [ ] Historiek toont geen vier nullen in de lege toestand — bewijs: hetzelfde screenshot, aparte waarneming
- [ ] Op geen van de drie detail-tabs dekt een knop de laatste rij af — bewijs: drie screenshots, elk met de onderste rij volledig zichtbaar
- [ ] De verwijderactie staat niet meer vast op de onderkant — bewijs: screenshot na scrollen
- [ ] De verwijderactie zit achter een extra stap — bewijs: het aantal tikken van scherm tot verwijderactie, geteld op het toestel
- [ ] De splitgrafiek toont bij 13 405 m niet meer dan 20 staven — bewijs: screenshot van de langste rit, staven geteld
- [ ] Bij 5 000 m staat het interval nog op 500 m — bewijs: screenshot van een kortere rit, het interval-label genoemd (tegenproef op de grens)

**Keten**

- [ ] Geen nieuwe ongebonden waarde — bewijs: `figma:check` binding-as, aantal vergeleken met 50 (stand 2026-09-14)
- [ ] `figma:check` groen op alle zestien assen — bewijs: exit-code plus het aantal assen
- [ ] `parity` groen op de gewijzigde frames — bewijs: exit-code plus het aantal vergeleken nodes
- [ ] De beeld-as blijft binnen zijn vloer op `overig` — bewijs: per frame de ontleding, niet de som van `grof`
- [ ] De nieuwe grafiek heeft een story — bewijs: `git ls-files` op het storybestand
- [ ] `render:sweep` rendert de nieuwe story zonder console-fout — bewijs: het aantal problemen uit de sweep, met de noemer

## Beslissingsgeschiedenis

- 2026-09-14: aangemaakt uit de designreview van dezelfde dag.
- 2026-09-14: de Figma-reparatie staat vóór het schermwerk in plaats van erna. Reden: drie frames
  zijn onzichtbaar op het canvas, dus elke review van die frames — inclusief die van dit werk —
  zou ze overslaan.
- 2026-09-14: de aanname dat de grafiek al gebouwd is, is omgedraaid naar "moet nog gebouwd
  worden", met de test erbij. De bronbriefing zegt `gebouwd` maar haar acceptatielijst en de
  afwezigheid van het component spreken dat tegen; dat is een kandidaat met een test, geen
  vastgestelde oorzaak.
- 2026-09-14: **de metrieklijst wordt een 2×3-grid** (keuze Jeroen), niet twee blokken. De
  scheiding tussen "nu" en "totaal" verhuist daarmee van een lijn naar de rijpositie. Er zijn
  twee acceptatie-items bijgekomen die de prijs van die keuze meten — de held moet groter
  blijven dan elke tegel en mag niet onder de vouw zakken — want een grid dat de held verdringt
  ruilt het ene hiërarchieprobleem voor het andere.
- 2026-09-14: **de splitgrafiek groepeert boven een grens** (keuze Jeroen). De grens zelf
  (20 staven) is mijn invulling en staat als aanname met de rekensom erbij, mét een tegenproef
  aan de andere kant van de grens.
