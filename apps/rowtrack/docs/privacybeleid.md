# Privacybeleid RowTrack

**Laatst bijgewerkt:** 7 augustus 2026 · **Versie:** 1.0 · **App-versie:** 1.0.0

Dit beleid beschrijft welke gegevens RowTrack verzamelt, waarom, en wat je ermee kunt doen. Het gaat
over de app zelf — niet over deze website of andere producten van umanex.

---

## In het kort

- RowTrack bewaart je **e-mailadres**, je **lichaamsgegevens** (geslacht, geboortedatum, lengte,
  gewicht) en je **trainingen**, inclusief je **hartslag ongeveer één keer per seconde** tijdens
  elke rit.
- Hartslag en lichaamsgegevens zijn **gezondheidsgegevens**. Die verwerken we alleen met jouw
  uitdrukkelijke toestemming, en je kunt die toestemming altijd intrekken.
- Er is **geen advertentie- of analysesoftware** in de app. Er wordt niets doorverkocht, niets
  gedeeld met adverteerders, en je gedrag wordt niet gevolgd buiten de app.
- Alles staat bij **één verwerker**: Supabase, die de database en de aanmelding host.
- Je kunt je account **in de app zelf volledig verwijderen**. Dan verdwijnt alles wat hieronder
  staat — onherroepelijk, zonder prullenbak.

---

## 1. Wie is verantwoordelijk

RowTrack wordt gemaakt en beheerd door:

**umanex CommV**
Eernegemweg 97, 8490 Jabbeke, België
E-mail: **jeroen@umanex.be**

umanex is de *verwerkingsverantwoordelijke*: degene die bepaalt welke gegevens verzameld worden en
waarom. Er is geen functionaris voor gegevensbescherming aangesteld; dat is voor een organisatie van
deze omvang en met deze verwerkingen niet verplicht. Vragen over je gegevens gaan naar het
e-mailadres hierboven.

---

## 2. Welke gegevens, waarvoor, en op welke grond

### 2.1 Je account

| Wat | Waarvoor | Grondslag |
|---|---|---|
| E-mailadres | Inloggen, wachtwoord herstellen, contact over je account | Uitvoering van de overeenkomst (art. 6.1.b) |
| Wachtwoord | Toegang beveiligen — opgeslagen als bcrypt-hash, nooit als leesbare tekst | Uitvoering van de overeenkomst |
| Voornaam (optioneel) | Je begroeten in de app | Uitvoering van de overeenkomst |

Je e-mailadres staat op meerdere plaatsen in het aanmeldsysteem van Supabase, omdat dat systeem het
zowel als inlognaam als in de sessiegegevens bijhoudt. Het gaat om hetzelfde adres, niet om
verschillende gegevens.

**Let op:** bij registratie sturen we op dit moment **geen bevestigingsmail**. Je adres wordt
geaccepteerd zonder dat je aantoont er toegang toe te hebben. Dat betekent ook dat iemand zich in
principe kan registreren met het adres van een ander. Krijg je ongevraagd mail van RowTrack over een
account dat je niet hebt aangemaakt, laat het dan weten via jeroen@umanex.be.

### 2.2 Je lichaamsgegevens

Geslacht, geboortedatum, lengte en gewicht. Allemaal optioneel — de app werkt zonder.

Ze worden gebruikt om je **calorieverbruik** te berekenen en om je trainingen in context te zetten.
Zonder gewicht valt het calorieverbruik terug op een standaardwaarde; dat zie je in de app aan een
sterretje bij het getal.

**Grondslag: jouw uitdrukkelijke toestemming** (art. 9.2.a). Zie sectie 3.

### 2.3 Je trainingen

Per rit bewaren we:

- **Tijd en afstand**: starttijdstip, duur, afgelegde meters.
- **Prestatie**: vermogen (watt, gemiddeld en maximum), slagfrequentie, tempo per 500 meter,
  beste split, totaal aantal slagen, weerstandsniveau, verbrande calorieën.
- **Hartslag**: gemiddelde en maximum, én — als je een hartslagmeter gebruikt — een meetpunt met je
  hartslag **ongeveer één keer per seconde**, de hele rit lang. Een rit van een half uur levert dus
  zo'n 1800 hartslagmetingen op.
- **Afgeleiden**: je beste 2000 meter, of een rit een persoonlijk record was, splits per segment.
- **Je doel** voor die rit en of je het gehaald hebt.

Die tijdreeks per seconde is fijnmaziger dan wat de app je toont. Hij is er zodat je beste 2000 meter
exact berekend kan worden en zodat we later grafieken kunnen tonen zonder je oude ritten kwijt te
zijn.

**Grondslag: jouw uitdrukkelijke toestemming** voor het hartslaggedeelte; uitvoering van de
overeenkomst voor de rest.

### 2.4 Gegevens die vanzelf ontstaan

Deze voer je niet in — ze ontstaan doordat je de app gebruikt.

| Wat | Waarom het er is |
|---|---|
| **IP-adres** bij het inloggen | Wordt door het aanmeldsysteem bij je sessie bewaard |
| **Toestelinformatie**: app-versie en versie van je besturingssysteem | Idem; zit in de technische kenmerken van je verbinding |
| **Tijdstip van je laatste aanmelding** | Idem |
| **Tijdstip van een wachtwoordreset-aanvraag** | Idem |
| **Aanmaak- en wijzigingstijdstippen** van je profiel en je ritten | Om wijzigingen te kunnen volgen en dubbele opslag te voorkomen |

**Grondslag: gerechtvaardigd belang** (art. 6.1.f) — de beveiliging van je account en het correct
laten werken van de dienst. Dit zijn standaardgegevens van het aanmeldsysteem; ze worden niet
gebruikt om je te profileren of te volgen.

### 2.5 Wat op je telefoon blijft staan

Een deel van je gegevens staat lokaal, niet op onze servers:

- **Je aanmeldsessie**, versleuteld in de beveiligde opslag van je toestel (Keychain op iOS). Die
  staat bewust buiten je iCloud-back-up.
- **Een rit die niet verstuurd kon worden** (bijvoorbeeld omdat je offline was) wordt tijdelijk
  onversleuteld op je toestel bewaard, inclusief je hartslagcurve, tot hij alsnog verstuurd is.
- **Welk bluetooth-toestel je het laatst gebruikte** — het id en de naam van je roeitrainer en
  hartslagmeter, zodat de app de volgende keer meteen kan verbinden. Dit verlaat je telefoon niet.

**Uitloggen wist dit alles.** Zowel uitloggen als je account verwijderen ruimt de niet-verstuurde
rit en de onthouden bluetooth-toestellen op. Deel je je telefoon met iemand anders, dan blijft er na
het uitloggen dus niets van jou achter in de app.

Eén ding blijft buiten onze macht: **de onversleutelde delen kunnen in de back-up van je telefoon
terechtkomen** — in iCloud (Apple) of Google Drive — zolang ze er staan. Dat is een back-up die jij
beheert, niet wij, maar het betekent wel dat een rit die nog niet verstuurd is met hartslaggegevens
daarin kan zitten.

---

## 3. Gezondheidsgegevens: waarom we het apart vragen

Je hartslag, gewicht, lengte, geboortedatum en geslacht zijn onder de AVG **bijzondere
persoonsgegevens** (artikel 9): gegevens over je gezondheid. Daar geldt een strenger regime voor. We
mogen ze alleen verwerken als jij daar **uitdrukkelijk toestemming** voor geeft — niet omdat het
handig is, en niet omdat je de app nu eenmaal gebruikt.

Daarom:

- Je geeft die toestemming **apart**, op een eigen scherm, en pas nadat je hebt kunnen lezen
  waarvoor. Er staat niets voorgevinkt en de twee keuzes zijn gelijkwaardig — ja is niet groter of
  opvallender dan nee.
- Je kunt de app **gebruiken zonder** je lichaamsgegevens in te vullen en zonder hartslagmeter. Je
  ritten worden dan gewoon opgeslagen, zonder hartslag en met een geschat calorieverbruik.
- Je kunt je toestemming **altijd intrekken**, met één schakelaar in je profiel — even makkelijk
  als geven. Trek je hem in, dan **wissen we wat er al is**: je hartslag wordt uit al je opgeslagen
  ritten verwijderd, samen met je gewicht, lengte, geboortedatum en geslacht. Je ritten zelf blijven
  bestaan, met afstand, tijd, vermogen en split. Dat wissen is onomkeerbaar.
- Zonder toestemming is de hartslagmeter niet koppelbaar en zijn de lichaamsvelden niet zichtbaar.
  Er wordt dan niets van deze gegevens vastgelegd — ook niet tijdelijk.

---

## 4. Bluetooth: wat je telefoon ziet

Om je roeitrainer te vinden, zoekt de app naar bluetooth-apparaten in de buurt. Tijdens dat zoeken —
maximaal vijftien seconden — ontvangt je telefoon kortstondig de signalen van **alle**
bluetooth-apparaten in je omgeving, ook die van anderen: telefoons, oordopjes, horloges.

RowTrack bewaart daarvan **niets** behalve je eigen toestel. De rest wordt meteen weggegooid en
verlaat je telefoon nooit. Dit is ook de reden dat Android bij bluetooth-scannen om
locatietoestemming vraagt: het besturingssysteem behandelt "zien welke apparaten in de buurt zijn"
als een aanwijzing over je locatie. RowTrack gebruikt je locatie niet en vraagt er op iOS niet om.

Bij het kiezen van een hartslagmeter krijg je een lijst te zien van de hartslagmeters in de buurt.
In een fitnessruimte kunnen daar dus ook banden van anderen tussen staan. Ook die lijst blijft op je
telefoon.

---

## 5. Wie je gegevens te zien krijgt

**Supabase** is onze enige verwerker. Zij hosten de database, het aanmeldsysteem en de functie die
je account verwijdert, en zij versturen de e-mails voor wachtwoordherstel. Zij verwerken je gegevens
uitsluitend in onze opdracht, op basis van een aanvaarde verwerkersovereenkomst.

**Apple of Google**, als beheerder van de back-up van je telefoon, kunnen de onversleutelde lokale
gegevens uit sectie 2.5 in je toestel-back-up hebben staan. Dat is een gevolg van hoe je telefoon
werkt, niet iets wat wij versturen.

Verder: **niemand**. Concreet betekent dat:

- Geen advertentienetwerken, geen advertentie-id's.
- Geen analyse- of statistiekpakket. Er zit geen Google Analytics, Firebase, Amplitude of iets
  vergelijkbaars in de app.
- Geen crashrapportage naar een externe dienst.
- Geen verkoop of verhuur van gegevens, aan niemand, om geen enkele reden.
- Geen doorgifte aan andere gebruikers. Je ritten zijn alleen voor jou zichtbaar; er is geen
  ranglijst, geen vriendenlijst, geen delen.

De app praat alleen met de server terwijl je hem gebruikt. Er is geen achtergrondmodus: sluit je de
app, dan stuurt hij niets meer.

---

## 6. Waar je gegevens staan

De database en het aanmeldsysteem draaien bij Supabase in de regio **Centraal-Europa (Frankfurt,
`eu-central-1`)**. Je gegevens blijven daarmee binnen de Europese Economische Ruimte; er is geen
doorgifte naar een land buiten de EER.

De back-up van je telefoon (sectie 5) is de uitzondering waar wij geen zeggenschap over hebben: waar
Apple of Google die opslaat, bepaal jij via de instellingen van je toestel.

---

## 7. Hoe lang we ze bewaren

| Gegeven | Bewaartermijn |
|---|---|
| Account, profiel en lichaamsgegevens | Tot je je account verwijdert |
| Trainingen, inclusief hartslag | Tot je de rit of je account verwijdert |
| Aanmeldsessie (met IP en toestelinformatie) | Tot je uitlogt of je account verwijdert — er staat geen automatische vervaltermijn op |
| Niet-verstuurde rit op je toestel | Tot hij alsnog verstuurd is, of tot je je account verwijdert |
| Onthouden bluetooth-toestellen | Tot je de app van je telefoon verwijdert |

Er is geen automatische opschoning: we bewaren je ritten zolang je account bestaat, omdat de waarde
van een trainingslogboek juist in de historiek zit. Wil je dat anders, dan verwijder je een losse rit
of je hele account.

---

## 8. Hoe we ze beveiligen

- Al het verkeer tussen de app en de server gaat over **TLS**.
- Je wachtwoord staat als **bcrypt-hash** opgeslagen, nooit leesbaar — ook niet voor ons.
- De database dwingt met **row level security** af dat je uitsluitend je eigen rijen kunt lezen en
  schrijven. Dat is een regel in de database zelf, niet alleen in de app.
- Je aanmeldsessie staat **versleuteld** in de beveiligde opslag van je toestel, buiten je
  iCloud-back-up.
- De functie die accounts verwijdert leidt af **wie** je bent uit je aanmeldtoken, niet uit wat de
  app meestuurt. Je kunt daarmee dus nooit het account van iemand anders verwijderen.

Geen enkele maatregel is absoluut. Merk je iets verdachts aan je account, laat het dan meteen weten.

---

## 9. Je rechten

Onder de AVG heb je recht op **inzage**, **correctie**, **verwijdering**, **beperking**, **bezwaar**
en **overdraagbaarheid** van je gegevens. Concreet:

**Zelf, meteen, in de app:**

- *Corrigeren* — je voornaam, lichaamsgegevens en doel pas je aan in je profiel.
- *Verwijderen van één rit* — via de detailpagina van die rit.
- *Verwijderen van alles* — Profiel → Account verwijderen. Je account, je profiel en al je ritten
  verdwijnen onmiddellijk en onherroepelijk. Er is geen herstelperiode en geen prullenbak.

**Via e-mail, aan jeroen@umanex.be:**

- *Inzage* — een overzicht van alles wat we van je hebben.
- *Overdraagbaarheid* — je gegevens in een machineleesbaar bestand.
- *Beperking of bezwaar*.

Er zit op dit moment **geen exportknop in de app**. Vraag je je gegevens op, dan halen we ze met de
hand uit de database en sturen we ze je toe. We reageren binnen **één maand**, zoals de AVG
voorschrijft.

Voor het intrekken van je toestemming voor gezondheidsgegevens: zie sectie 3.

---

## 10. Leeftijd

RowTrack is niet gericht op kinderen. Je moet **minstens 16 jaar** zijn om een account aan te maken —
onder die leeftijd kun je in België niet zelfstandig toestemming geven voor de verwerking van je
gegevens. Merken we dat een account van een jonger kind is zonder toestemming van een ouder, dan
verwijderen we het.

---

## 11. Wijzigingen aan dit beleid

Verandert er iets aan welke gegevens we verzamelen of waarom, dan passen we dit document aan en
verhogen we het versienummer bovenaan. Bij een wezenlijke wijziging — zeker als die je
gezondheidsgegevens raakt — vragen we je opnieuw om toestemming in plaats van je voor een voldongen
feit te zetten.

---

## 12. Klacht indienen

Ben je het oneens met hoe we met je gegevens omgaan, neem dan eerst contact op via jeroen@umanex.be.
Kom je er zo niet uit, dan kun je klacht indienen bij de Belgische toezichthouder:

**Gegevensbeschermingsautoriteit**
Drukpersstraat 35, 1000 Brussel
contact@apd-gba.be · www.gegevensbeschermingsautoriteit.be

Woon je in een ander EU-land, dan kun je terecht bij de toezichthouder van dat land.
