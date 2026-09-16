# Functionele review RowTrack

Datum: 15 september 2026 · codeversie: `022531b`.

## Oordeel en bereik

De basisflows zijn aanwezig: account aanmaken en herstellen, toestellen verbinden, trainen met of zonder doel, samenvatting, historiek, periodedoelen en profielbeheer. De belangrijkste verbeteringen zitten in het betrouwbaar afmaken van die flows: bewaren, hervatten, consistente doelen en betrouwbare cijfers.

Dit is een review van de huidige broncode en bestaande documentatie, met uitvoering van de bestaande tests en typecontrole. Geen live database, mobiele UI of fysieke roeitrainer getest. Onderstaande defecten zijn uit concrete codepaden afgeleid; de scenario's zijn acceptatietests voor een volgende toestelronde, geen claim dat die ronde al uitgevoerd is. Prioriteit P1 betekent eerst oplossen; P2 betekent daarna. Er is geen applicatiecode gewijzigd.

## Eerst oplossen

### F1 · P1 — Offline opslag kan een eerdere training verliezen

**Scenario:** voltooi training A offline, ga naar Home terwijl je nog offline bent en voltooi daarna training B. Beide pogingen schrijven naar dezelfde lokale sleutel; B vervangt A. De retry op Home voorkomt dat niet zolang het netwerk ontbreekt.

Er is bovendien een onbeschermd interval: de rit wordt pas lokaal vastgelegd nadat de serveraanroep een fout teruggeeft. Sluit de app tijdens die aanroep en er is nog geen lokale kopie. De samenvatting verschijnt ondertussen al, zonder onderscheid tussen opgeslagen en nog te synchroniseren. Lokale schrijffouten worden ingeslikt.

**Bron:** `lib/pendingWorkout.ts:39–45`; `app/(tabs)/workout.tsx:221–248, 277–290`.

**Verbetering:** eerst duurzaam lokaal vastleggen, daarna synchroniseren vanuit een wachtrij per gebruiker en training. Toon “Opgeslagen op dit toestel”, “Synchroniseren” en “Gesynchroniseerd”, met herstel bij fouten.

**Acceptatie:** twee offline trainingen blijven beide bestaan na herstart en verschijnen na herstel van internet precies één keer in de historiek. Ook afsluiten tijdens de serveraanroep verliest geen voltooide rit.

### F2 · P1 — De volgende training kan met een ander doel starten dan zichtbaar is

**Scenario:** kies 10 km, rond de training af, ga verder en open opnieuw Training. `IdlePhase` wordt opnieuw gemount en zet de afstandskeuze op standaard 5 km. De bovenliggende workout houdt de eerdere 10 km vast en gebruikt die bij Start. De picker leest de opgeslagen keuze niet terug.

**Bron:** `components/workout/IdlePhase.tsx:113–116`; `app/(tabs)/workout.tsx:79–120, 287–290, 330`.

**Verbetering:** één gedeelde doelwaarde voor picker, suggesties en startactie. Kies bewust of een volgende training de vorige keuze onthoudt of alles reset.

**Acceptatie:** na elke afgeronde training zijn getoond doel, gestart doel en opgeslagen doel identiek, ook zonder de picker aan te raken.

### F3 · P1 — Tempo- en vermogensdoelen kunnen een training vrijwel meteen beëindigen

Tijd en afstand zijn eindpunten. Tempo en vermogen zijn intensiteiten, maar krijgen hetzelfde stopgedrag. Bij een tempodoel van 2:00/500 m volstaat één ruwe meting van 1:59; bij een vermogensdoel van 180 W kan de eerste sterke haal het gemiddelde al boven de drempel brengen. De app slaat dan op en verbreekt de verbinding. Er is geen vereiste volhoudduur. Als afstand of duur nog nul is, kan die beëindigde training bovendien door de opslagguard worden overgeslagen.

Het scherm toont gesmoothd actueel tempo/vermogen, terwijl de doeltoets ruw tempo respectievelijk gemiddeld vermogen gebruikt. Het getoonde cijfer hoeft dus niet te verklaren waarom de training stopt.

**Bron:** `lib/workout-goals.ts:136–147`; `lib/hooks/useGoalProgress.ts:76–87`; `app/(tabs)/workout.tsx:299–314`; `components/workout/ActivePhase.tsx:275–278`.

**Verbetering:** maak tempo/vermogen een streefzone binnen een tijd- of afstandstraining, of definieer expliciet “houd dit X seconden vol”. Laat bereiken standaard vieren zonder de rit onmiddellijk te beëindigen, tenzij de gebruiker dat gekozen heeft.

**Acceptatie:** een korte piek beëindigt geen bedoelde duurinspanning; doelindicator en beëindigingsregel gebruiken dezelfde betekenis.

### F4 · P1 — De gezondheidskeuze wordt niet in alle gebruikerspaden toegepast

Zonder toestemming blokkeert het startscherm de hartslagknop, maar het actieve scherm ontvangt rechtstreeks `startHRScan`. De gebruiker kan tijdens het roeien alsnog verbinden en BPM zien. De metrics-hook verzamelt ook hartslag uit de roeitrainer zonder de toestemmingsstatus te kennen. De opslag van een nieuwe rit filtert die waarden wel.

Daarnaast wist intrekken de servergegevens, maar zuivert het geen reeds lokaal wachtende rit. Die bevat mogelijk hartslag en wordt later ongewijzigd opnieuw aangeboden. Of de server dat alsnog blokkeert is niet live gecontroleerd; het clientpad biedt die bescherming niet.

**Bron:** `app/(tabs)/workout.tsx:341–343, 379`; `components/workout/ActivePhase.tsx:280–309`; `lib/hooks/useWorkoutMetrics.ts:265–305`; `lib/health-consent-context.tsx:95–109`; `lib/pendingWorkout.ts:109–132`.

**Verbetering:** dezelfde keuze toepassen bij verbinden, verzamelen, tonen en synchroniseren. Bij intrekken ook lokale gegevens en openstaande uploads aanpassen.

**Acceptatie:** na weigeren is hartslag verbinden ook tijdens de rit geblokkeerd. Een vóór intrekken klaargezette offline rit brengt later geen hartslag terug.

### F5 · P1 — Een lopende training heeft geen herstelpad na app-uitval

De actieve fase, metingen en tijdreeks leven uitsluitend in geheugen. De lokale fallback geldt alleen voor een voltooide rit met een mislukte serveropslag. Na geforceerd sluiten of een crash begint de app weer in idle, zonder aanbod om de onderbroken rit terug te halen.

**Bron:** `lib/workout-phase-context.tsx:18`; `lib/hooks/useWorkoutMetrics.ts:96–136`; `app/(tabs)/workout.tsx:129–248`.

**Verbetering:** periodiek een lokaal herstelpunt bewaren en bij herstart “Training herstellen of afronden” aanbieden.

**Acceptatie:** halverwege geforceerd sluiten levert na herstart een herstelbare training op met de laatst veilig bewaarde waarden.

## Daarna verbeteren

### F6 · P2 — Persoonlijke records vergeten oudere topprestaties

De recordbaseline kijkt uitsluitend naar de laatste 100 trainingen. Een bestaand record buiten dat venster kan opnieuw als verbeterd worden gemeld, ook als de nieuwe prestatie slechter is dan het echte record. Home haalt bepaalde records wel over alle ritten op, waardoor beide schermen kunnen tegenspreken.

**Bron:** `lib/hooks/useGoalProgress.ts:99–105`; `lib/hooks/usePeriodGoal.ts:64–93`.

**Verbetering/acceptatie:** bereken records over de volledige historiek; een beste prestatie op training 1 blijft de baseline na training 101.

### F7 · P2 — Hartslagupdates kunnen roeigemiddelden beïnvloeden

De metrics-effect draait zowel op roeipakketten als op gewijzigde BPM. Alleen de smoothing wordt tegen dubbel verwerken beschermd; watts, slagfrequentie en split tellen de oude roeimeting opnieuw mee bij een BPM-update. Dat corrigeert niet vanzelf als het aantal hartslagupdates tussen roeipakketten verschilt: 100 en 200 W geven 150 W, maar één extra telling van 200 W maakt dat 167 W.

**Bron:** `lib/hooks/useWorkoutMetrics.ts:150–205, 325`.

**Verbetering/acceptatie:** scheid de meetbronnen en definieer de middeling. Dezelfde roeireeks moet met en zonder wisselende hartslag exact dezelfde roeigemiddelden opleveren.

### F8 · P2 — Home kan een gesynchroniseerde rit tonen zonder bijgewerkt periodedoel

De recente ritten wachten eerst op de offline retry. De doelkaart heeft een eigen focus-fetch die daar parallel naast loopt. Daardoor kan de doelkaart vóór de insert lezen en de lijst erna. Ook pull-to-refresh start beide paden parallel.

**Bron:** `app/(tabs)/index.tsx:117, 165–178`; `lib/hooks/usePeriodGoal.ts:154–157`.

**Verbetering/acceptatie:** na succesvolle synchronisatie alle afhankelijke totalen verversen. Eén terugkeer naar Home toont de rit én de bijbehorende nieuwe voortgang.

### F9 · P2 — Een reset van de roeitrainer tijdens reconnect kan de sessietellers breken

Afstand en tijd worden steeds berekend als actuele toestelteller minus de teller bij de start. Als de roeitrainer na uit- en inschakelen op nul terugkomt, kan de sessiewaarde negatief worden. De code detecteert die tellerreset niet. Of de Apollo XL dit bij een gewone disconnect doet, moet op het toestel worden vastgesteld; bij een geresette teller is het rekenpad duidelijk.

**Bron:** `lib/hooks/useWorkoutMetrics.ts:249–260`.

**Verbetering/acceptatie:** herken een nieuwe tellerreeks en tel die bij de reeds afgelegde sessie op. Na een toestelreset gaan afstand en duur nooit achteruit; eventueel ontbrekende data wordt herkenbaar gemeld.

### F10 · P2 — Opslaan en laden hebben geen vaste eindtoestand bij een hangend verzoek

De onderzochte home-, historiek-, doel- en opslagpaden hebben geen expliciete app-deadline of annuleerbaar herstel. Ze wachten op een antwoord of fout van de onderliggende verbinding. In combinatie met F1 blijft daardoor ook lokale vastlegging wachten. Foutafhandeling is op verschillende schermen aanwezig, maar helpt pas zodra het verzoek terugkeert.

**Bron:** `lib/supabase.ts`; `app/(tabs)/index.tsx:109–161`; `app/(tabs)/history/index.tsx:68–120`; `lib/hooks/usePeriodGoal.ts:47–150`.

**Verbetering/acceptatie:** begrens wachttijd en bied opnieuw proberen met behouden invoer. Test een verbinding die open blijft zonder antwoord, naast gewoon offline zijn.

## Overige losse eindjes en productkansen

- **Hartslagfouten tijdens een rit:** `hrError` bereikt alleen de idle-weergave. Toon tijdens inspanning een korte herstelactie, bijvoorbeeld “Band niet gevonden · Opnieuw”. Bestaand open backlogpunt, nog zichtbaar in de code.
- **Geen productie-foutregistratie:** `lib/monitoring.ts` doet uitsluitend iets in development. Opslagfouten uit F1 blijven in productie dus ook buiten zicht van de maker. Rond de bestaande monitoringkoppeling af.
- **Database opnieuw kunnen opbouwen:** README verklaart het historische schema expliciet ongeschikt als installatiepad. Maak migraties reproduceerbaar voordat herstel of een tweede omgeving nodig is. De live schematoestand is hier niet gecontroleerd.
- **Functionele testdekking:** de enige Maestro-flow controleert het inlogscherm. Voeg volledige scenario's toe voor training → opslag → Home → historiek, tweede training, offline herstel, toestemming en accountbeheer. Componentrenders bewijzen deze samenhang niet.
- **Leesbaarheid tijdens roeien:** toets de in de backlog genoemde kleine labels, tikdoelen en schermlezerbediening op een telefoon op roeiafstand. De actuele visuele ernst is in deze review niet opnieuw gemeten.
- **Meer trainingswaarde:** zodra betrouwbaarheid op orde is, zijn “Herhaal deze training”, vergelijking met de vorige vergelijkbare rit, een expliciete pauze/hervat-keuze en data-export logische kandidaten. Dit zijn productvoorstellen, geen bevestigde defects.
- **Backlog actualiseren:** de oude audit staat nog als één open blok met historische aantallen. Minstens de wisbevestiging op de toestemmingsgate en de Nederlandse inlogfouten zijn inmiddels gebouwd. Gebruik die oude P0/P1-aantallen niet als huidige stand; maak per bevinding de status expliciet.

## Verificatie en volgorde

- Bestaande tests: **69 geslaagd, 0 gefaald**.
- Typecontrole: **geslaagd, 0 fouten**.
- Geen live toestel-, server- of mobiele end-to-end-verificatie uitgevoerd.

Aanbevolen volgorde:

1. **Bewaren en herstellen:** F1, F5 en F10, inclusief zichtbare opslagstatus.
2. **Doelkeuze en doelgedrag:** F2 en F3.
3. **Consequente gezondheidskeuze:** F4, inclusief lokale wachtrij.
4. **Vertrouwen in cijfers:** F6–F9.
5. **Eén volledige toestelronde:** bovenstaande acceptaties, gevolgd door leesbaarheid en foutmeldingen.

De grootste winst is dat de gebruiker kan vertrouwen op drie dingen: wat ik instel is wat ik start, wat ik roei blijft bewaard, en de cijfers betekenen op elk scherm hetzelfde.
