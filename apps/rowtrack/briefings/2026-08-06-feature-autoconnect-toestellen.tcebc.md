# Autoconnect met bekende toestellen

- **Datum:** 2026-08-06
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gepland

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

- [ ] Autoconnect vuurt bij het openen van het trainingsscherm, niet bij app-start.
- [ ] Bekend toestel in de buurt → verbonden zonder dat de gebruiker iets tikt.
- [ ] Bekend toestel niet in de buurt → valt terug op scannen, en daarna op een duidelijke fout;
      geen oneindig "verbinden…".
- [ ] **State loading:** de rij toont dat er verbonden wordt, met onderscheid tussen "bekend
      toestel" en "zoeken".
- [ ] **State empty:** niets gevonden → melding die zegt wat de gebruiker kan doen (zoals de
      HR-melding die er nu al is).
- [ ] **State error:** mislukte autoconnect blokkeert niets; handmatig verbinden blijft werken.
- [ ] **State connected:** naam van het verbonden toestel zichtbaar per rij.
- [ ] Meerdere gevonden toestellen → keuze-sheet, met signaalsterkte, voor beide types.
- [ ] "Ander toestel kiezen" is bereikbaar terwijl er een verbinding staat, en verbreekt die eerst.
- [ ] Handmatig verbreken werkt altijd en zet autoconnect uit tot de gebruiker zelf verbindt —
      ook wanneer hij het scherm intussen verlaat en terugkomt.
- [ ] Het gekozen toestel wordt onthouden en overleeft een herstart van de app.
- [ ] Een vergeten/vervangen toestel is te wissen zonder de app opnieuw te installeren.
- [ ] Autoconnect start nooit een tweede scan naast een lopende (één gedeeld scan-slot,
      zie `lib/ble/scan-lock.ts`).
- [ ] `tsc --noEmit` groen.

## Beslissingsgeschiedenis

- 2026-08-06: aangemaakt naar aanleiding van een echte rit waarbij de hartslagmeter na afloop niet
  meer te verbinden was. De losse fixes daarvoor zitten in PR #210; deze briefing gaat over het
  bredere gedrag dat die episode blootlegde — dat verbinden nu volledig op scannen leunt, terwijl
  ble-plx rechtstreeks op id kan verbinden.
- 2026-08-06: vier productkeuzes beantwoord (beide toestellen · trigger bij schermbezoek · alleen
  het laatst gebruikte toestel · verbreken schakelt autoconnect uit). Open vragen leeg, klaar om
  te bouwen.
