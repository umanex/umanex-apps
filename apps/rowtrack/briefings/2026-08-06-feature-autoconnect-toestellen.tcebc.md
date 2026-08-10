# Autoconnect met bekende toestellen

- **Datum:** 2026-08-06
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gebouwd

---

```
TASK:        De app verbindt zelf met de roeitrainer en hartslagmeter die je vorige keer
             gebruikte, en laat je altijd loskoppelen of een ander toestel kiezen.

CONTEXT:     Vandaag begint elke rit met twee keer tikken en wachten op een scan. De roeier
             pakt bovendien blind het eerste toestel dat "Rower" heet — bij twee trainers in
             één ruimte is dat een gok. De hartslagmeter heeft wél een keuzelijst, maar alleen
             wanneer er toevallig meerdere gevonden worden.

ELEMENTS:    Toestellen-kaart op het idle-scherm (bestaande DeviceRow per type) ·
             gedeelde keuze-sheet met gevonden toestellen + signaalsterkte ·
             "Ander toestel kiezen"-actie per rij · onthouden-toestel-opslag (lokaal).

BEHAVIOUR:   Idle-scherm openen → bekend toestel bekend? dan meteen verbinden zonder scan
             (rechtstreeks op id, geen zoektocht). Lukt dat niet binnen een korte tijd →
             terugvallen op scannen. Eén toestel gevonden → verbinden. Meerdere → keuze-sheet.
             Elke rij blijft handmatig te verbreken; verbreken schakelt autoconnect uit tot je
             opnieuw verbindt. "Ander toestel kiezen" opent de sheet ook wanneer er al een
             verbinding staat.

CONSTRAINTS: iPhone portrait · geen nieuwe dependency (ble-plx kan verbinden op id via
             `devices([id])` / `connectToDevice(id)`, en `connectedDevices([service])` vindt
             wat al aan de telefoon hangt) · onthouden per toestel-id + naam, lokaal
             (AsyncStorage), niet in het profiel · rol-tokens only · NL copy via `t.*`.
```

---

## Open vragen

Geen. De vier productkeuzes zijn beantwoord (2026-08-06):

1. **Scope:** beide toestellen — roeitrainer én hartslagmeter.
2. **Trigger:** bij het openen van het trainingsscherm. Niet bij app-start: dan zou de app ook
   Bluetooth doen wanneer je enkel je historiek bekijkt, wat batterij kost en de trainer bezet houdt.
3. **Geheugen:** alleen het laatst gebruikte toestel per type. Een ander toestel kiezen overschrijft
   het onthouden toestel; geen beheer-UI nodig.
4. **Na verbreken:** autoconnect blijft uit tot je zelf weer verbindt. Verbreken betekent verbreken —
   anders vecht de app tegen de gebruiker.

## Aannames

- `[ASSUMPTION: één gedeelde keuze-sheet]` — de hartslagmeter heeft er al een (`hrSelecting` →
  lijst met signaalsterkte). Die wordt gegeneraliseerd naar beide types in plaats van een tweede
  variant te bouwen; de roeier krijgt er dus een die er nu niet is.
- `[ASSUMPTION: verbinden op id vóór scannen]` — sneller én het omzeilt het probleem dat een
  verbonden of traag adverterend toestel niet in scanresultaten opduikt. De scan blijft de
  terugvaloptie, nooit de eerste zet.
- `[ASSUMPTION: geen automatische herverbinding midden in een rit]` — dat pad bestaat al
  (`attemptReconnect`) en blijft ongemoeid. Dit gaat alleen over de start van een sessie.
- `[ASSUMPTION: lokaal onthouden]` — een toestel-id is toestel-gebonden en op iOS bovendien een
  per-app UUID; in het Supabase-profiel zetten zou het over telefoons heen betekenisloos maken.

## Acceptatie

- [x] Autoconnect vuurt bij het openen van het trainingsscherm, niet bij app-start
      (`useFocusEffect` in `app/(tabs)/workout.tsx`, alleen in de idle-fase).
- [x] Bekend toestel in de buurt → verbonden zonder dat de gebruiker iets tikt, rechtstreeks op
      id en dus zonder scan.
- [x] Bekend toestel niet in de buurt → de poging faalt stil binnen 8 s en laat de rij op
      "Verbinden" staan; geen foutmelding voor iets wat de gebruiker niet vroeg.
- [x] **State loading:** 'connecting' met de onthouden naam bij autoconnect, 'scanning' bij zoeken.
- [x] **State empty:** niets gevonden → de melding onder de toestellen-kaart (uit PR #210).
- [x] **State error:** een mislukte autoconnect blokkeert niets; handmatig verbinden blijft werken.
- [x] **State connected:** naam van het verbonden toestel zichtbaar per rij (bestaand gedrag).
- [x] Meerdere gevonden toestellen → keuze-sheet met signaalsterkte, nu voor **beide** types.
      De roeier pakte voorheen blind de eerste treffer.
- [ ] "Ander toestel kiezen" als eigen actie terwijl er een verbinding staat. → *Niet gebouwd.
      `DeviceRow` draagt één actie; een tweede knop is een design-wijziging aan een component dat
      op twee plekken leeft, en er is geen Figma-referentie voor dit scherm (bekend dekkingsgat).
      Functioneel is het pad er wel: Verbreken → Verbinden → keuzelijst.*
- [x] Handmatig verbreken zet autoconnect uit tot de gebruiker zelf verbindt — de `suppressed`-set
      in de context overleeft het verlaten en terugkeren van het scherm.
- [x] Het gekozen toestel wordt onthouden (AsyncStorage) en overleeft een herstart.
- [x] Een ander toestel kiezen overschrijft het onthouden toestel; `forgetKnownDevice` bestaat voor
      een expliciete wis-actie.
- [x] Autoconnect start geen scan, dus ook geen tweede scan naast een lopende. Het scan-pad zelf
      gaat nog altijd via het gedeelde slot in `lib/ble/scan-lock.ts`.
- [x] `tsc --noEmit` groen.

**Op de erg gereden — 2026-08-10.** De eerste rit met de gebouwde versie liet álle scenario's falen.
Root cause was niet de feature-logica maar de volgorde eronder: `autoConnect` is bij een koude start
de eerste BLE-aanraking van het proces, dus hij maakte de `BleManager` en verbond er in dezelfde tick
mee, terwijl `CBCentralManager` nog op `.unknown` stond. Elke poging werd afgewezen met BleError 103,
vóór er naar een toestel gezocht werd. Handmatig verbinden bleef werken omdat `startScan` de
adapterstatus wél las — `connectKnown` had die guard nooit gekregen. Gefixt in PR #248 door de wacht
in `getManager()` te zetten in plaats van bij de aanroepers, met `lib/ble/adapterReady.test.ts` als
tegenproef aan beide kanten. Ná die fix door Jeroen op de erg bevestigd: autoconnect werkt.

**Waarom nog niet `gevalideerd`.** Eén acceptatie-item is bewust niet gebouwd (hierboven). De
hardware-as is daarmee wél gesloten; dit is het enige dat de status nog tegenhoudt.

## Beslissingsgeschiedenis

- 2026-08-06: aangemaakt naar aanleiding van een echte rit waarbij de hartslagmeter na afloop niet
  meer te verbinden was. De losse fixes daarvoor zitten in PR #210; deze briefing gaat over het
  bredere gedrag dat die episode blootlegde — dat verbinden nu volledig op scannen leunt, terwijl
  ble-plx rechtstreeks op id kan verbinden.
- 2026-08-06: vier productkeuzes beantwoord (beide toestellen · trigger bij schermbezoek · alleen
  het laatst gebruikte toestel · verbreken schakelt autoconnect uit). Open vragen leeg, klaar om
  te bouwen.
