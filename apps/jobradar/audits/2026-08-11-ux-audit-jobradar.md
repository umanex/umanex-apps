# UX-audit — jobradar

**Geaudit:** dashboard (`/`) en zoekinstellingen (`/instellingen`)
**Datum:** 2026-08-11
**Platform:** web, desktop-first
**Methodiek:** IxDF-framework — 7 factoren, 5 usability-karakteristieken, 5 interactie-dimensies
**Bron:** draaiende build van `feature/jobradar-zinsnedes` op een consistente kopie van de echte
database (327 vacatures, 26 leads), bediend in Chrome

---

## Samenvatting

**54 / 85** — op de grens van D en C. De score is een communicatiemiddel; de bevindingenlijst
hieronder is de eigenlijke uitkomst.

Het opvallende aan jobradar is hoe eerlijk hij is over zichzelf. De dekkingsindicator, de
bronwaarschuwingen bij een sync, de microcopy die uitlegt dat *"product ook op productie
matcht"* — dat is zeldzaam en het is de sterkste kant van dit product. Het bouwt vertrouwen
door zijn eigen beperkingen te tonen in plaats van te verbergen.

Diezelfde eerlijkheid ontbreekt precies op de plek waar het product zijn waarde claimt. **Een
lead is een bewering zonder bewijspad.** De kaart zegt *"Smals · dev-vacature zonder design ·
75"* en biedt geen enkele weg naar de vacatures die tot dat oordeel leidden — geen link, geen
telling, geen "toon de 8 vacatures". De afleiding rékent die getallen wel uit
(`designVacatures`, `devVacatures`, `totaalVacatures` in `Bedrijfsprofiel`) en gooit ze
vervolgens weg. Dat is de duurste bevinding, want het raakt het enige waarvoor je de app
opent.

**Top 3:**

1. Een lead is niet naar zijn bewijs te herleiden (P1)
2. Geen zoekveld over 327 vacatures (P1)
3. Een statuswijziging die faalt, faalt stil (P2 — al bekend sinds de eerste sweep)

---

## 7 UX-factoren

| Factor | Score | Kern |
|---|---|---|
| Useful | 4/5 | Lost een echt probleem op, en de afgeleide leads zijn meer dan een vacaturelijst |
| Usable | 3/5 | Legibel en voorspelbaar, maar triage over 327 kaarten is handwerk |
| Findable | 2/5 | Geen zoekveld, geen sorteerkeuze, geen weg van lead naar vacature |
| Credible | 4/5 | Dekkingsindicator en bronwaarschuwingen bouwen actief vertrouwen |
| Desirable | 3/5 | Rustig en consistent, maar zonder visuele hiërarchie tussen 75 en 30 |
| Accessible | 3/5 | Alles heeft een naam, `lang="nl"`, één contrastfout, doelgroottes te klein |
| Valuable | 4/5 | Hoge waarde per regel code voor een tool van één gebruiker |

**Totaal: 23/35**

**Useful.** De vacaturekant is een aggregator; de leadkant is het eigenlijke product. *"Dit
bedrijf bouwt software en heeft geen designer"* is een propositie die je nergens anders koopt.
Gap: die propositie is niet controleerbaar (zie Findable).

**Credible — de sterkste factor, en dat verdient uitleg.** Drie dingen doen hier werk dat de
meeste apps overslaan: de regel *"51 van 327 vacatures geclassificeerd"* maakt de dekking een
getal in plaats van een suggestie; de sync-waarschuwingen (`BRU: 250 van 409 opgehaald`)
melden afkapping in plaats van hem te verzwijgen; en de microcopy op `/instellingen` legt het
mechanisme uit in plaats van de knop. Dat is de reden dat deze factor een 4 haalt terwijl de
leads onbewijsbaar zijn — het product liegt nergens, het laat alleen iets weg.

**Accessible.** Gemeten, niet geschat: één contrastfout (de `|`-scheiding in de
dekkingsindicator, ratio 1.24 tegen een drempel van 4.5), nul interactieve elementen zonder
toegankelijke naam, `lang="nl"` aanwezig, één landmark (`main`). Vier soorten doelgroottes
onder de 24×24 CSS-px van WCAG 2.2 AA, waarvan de regio-checkboxes (16×16) het duidelijkst.

---

## 5 usability-karakteristieken

| Karakteristiek | Score | Kern |
|---|---|---|
| Effectiveness | 3/5 | Vacatures triëren lukt; een lead verifiëren niet |
| Efficiency | 2/5 | 327 kaarten, geen zoek, geen sortering — scannen is de enige strategie |
| Engagement | 3/5 | Prettig genoeg, niet meer dan dat |
| Error tolerance | 3/5 | Sync-fouten zijn nu zichtbaar; statuswijzigingen falen stil |
| Ease of learning | 4/5 | Zelfverklarend, en de dekkingsregel leert je het model |

**Totaal: 15/25**

**Utility + Usability = Usefulness.** De juiste features zijn er grotendeels: ophalen, scoren,
classificeren, filteren, status bijhouden, zoektermen beheren. Wat ontbreekt is niet een
feature maar een *verbinding* — tussen een lead en zijn vacatures, en tussen jou en één
specifieke vacature in een lijst van 327. Beide zijn zoekproblemen, en zoeken is precies wat
er niet is.

---

## 5 interactie-dimensies

| Dimensie | Score | Kern |
|---|---|---|
| Words | 4/5 | Nederlands, jargonvrij, en de microcopy legt mechanismen uit |
| Visual representations | 3/5 | Consistent, maar signalen van 30 en 20 punten zien er identiek uit |
| Physical / space | 3/5 | Doelgroottes onder 24px; responsive niet te verifiëren met mijn gereedschap |
| Time | 3/5 | Een sync duurt ~12s met alleen een draaiend icoon; geen `loading.tsx` |
| Behavior | 3/5 | Sync-feedback is goed; een mislukte statuswijziging geeft geen enkel teken |

**Totaal: 16/25**

**Words is de uitschieter.** *"Adzuna matcht op losse woorden en rekt ze op — een term met een
spatie wordt gesplitst, en 'product' matcht ook 'productie'."* Dat is geen hulptekst maar een
uitleg van het mechanisme, op de plek waar je hem nodig hebt. Zelfde voor *"Houd de lijst
kort: te breed uitsluiten kost echte leads."* — dat is een gemeten les, in de UI gezet.

**Visual representations.** De signaalbadges zijn alle vier `variant="outline"`, terwijl
`dev-vacature zonder design` 30 punten weegt en `recente groei` 20. Het zwaarste signaal — het
signaal waarvoor dit product bestaat — is visueel niet te onderscheiden van het lichtste.

---

## Bevindingen

### P1 — Een lead is niet naar zijn bewijs te herleiden

**Geschonden:** Findable, Credible, Effectiveness, Behavior
**Bewijs:** `components/LeadCard.tsx:80` rendert een link alleen bij `company.url`, en een
afgeleide lead heeft er per definitie geen — Adzuna levert geen bedrijfs-URL. Op het
Leads-tabblad is er dus geen enkel pad van *"Smals · dev-vacature zonder design · 75"* naar de
vacatures die dat oordeel dragen. `lib/signals.ts` berekent `designVacatures`, `devVacatures`
en `totaalVacatures` per bedrijf en gebruikt ze alleen voor de drempels; ze worden nergens
opgeslagen of getoond.
**Impact:** de kernbelofte van het product is niet controleerbaar. Bij twijfel moet je naar het
andere tabblad en handmatig zoeken — waar geen zoekveld is.
**Effort:** M

### P1 — Geen zoekveld over 327 vacatures

**Geschonden:** Findable, Efficiency
**Bewijs:** `components/FilterBar.tsx` biedt regio, status en minimumscore. Geen tekstveld,
geen sorteerkeuze. De lijst staat vast gesorteerd op score (`app/page.tsx:11`). Met 327 kaarten
(en 26 leads) is scannen de enige manier om een specifiek bedrijf of een specifieke titel terug
te vinden.
**Impact:** elke gerichte vraag ("had ik die Cegeka-vacature al gezien?") wordt bladerwerk.
**Effort:** S

### P2 — Een mislukte statuswijziging geeft geen enkel teken

**Geschonden:** Error tolerance, Behavior
**Bewijs:** `components/StatusDropdown.tsx` heeft `try … finally` zonder `catch`, en doet
`if (res.ok) onStatusChange(...)` zonder else-tak. Bij een 400/500 springt de controlled
`select` terug naar de oude waarde zonder melding; bij een netwerkfout ontstaat een
onafgevangen promise rejection. Al gesignaleerd in de eerste sweep van 2026-08-10 en sindsdien
open.
**Impact:** je denkt iets op "opgeslagen" te zetten en dat is niet zo. Stille datafout.
**Effort:** S

### P2 — Doelgroottes onder de WCAG 2.2-drempel

**Geschonden:** Accessible, Physical/space
**Bewijs:** gemeten in de browser. Onder 24×24 CSS-px: regio-checkboxes 16×16, de
status-`select` op elke kaart 99×16, de "Bekijk"-link 49×16, de "Instellingen"-link 75×20.
Inline tekstlinks ("Bekijk", "Instellingen") vallen onder de uitzondering van het criterium; de
checkboxes en de select niet.
**Impact:** mistikken bij muisgebruik, en onbruikbaar op touch.
**Effort:** S

### P2 — Een sync duurt ~12 seconden zonder voortgang

**Geschonden:** Time
**Bewijs:** gemeten na de throttle-commit: 12s voor een volledige sync. De knop toont een
draaiend icoon en "Bezig…", verder niets. Er is geen `app/loading.tsx`, dus ook de eerste
paginaweergave heeft geen skeleton.
**Impact:** twaalf seconden zonder teken van vooruitgang leest als vastgelopen.
**Effort:** S voor per-regio voortgang (de data zit al in `sourceStatuses`), M voor een skeleton

### P3 — Contrast van de `|`-scheiding in de dekkingsindicator

**Geschonden:** Accessible
**Bewijs:** contrast-sweep over alle tekstelementen: één fout, ratio **1.24** tegen een drempel
van 4.5. Het is `text-border` op `CoverageBar.tsx`. Hij is `aria-hidden`, dus schermlezers
slaan hem over — maar visueel is hij vrijwel onzichtbaar, wat de scheiding zinloos maakt.
**Effort:** S

### P3 — Kopstructuur springt van h1 naar h3

**Geschonden:** Accessible
**Bewijs:** 1× h1, 327× h3, geen enkele h2. Elke kaarttitel is een h3, waardoor de
koppen-outline van een schermlezer 327 items lang is en geen structuur meer draagt.
**Effort:** S

### P3 — Focus is inconsistent tussen knoppen en links

**Geschonden:** Accessible, Visual representations
**Bewijs:** knoppen uit `@umanex/ui` dragen `focus-visible:ring-2 focus-visible:ring-ring`; de
links in de app-code (`Instellingen`, `Bekijk`, `Terug naar het dashboard`) hebben geen enkele
focus-klasse en vallen terug op de browserstandaard. Er is géén globale `outline: none`, dus
focus is wél zichtbaar — alleen anders van vorm.
**Effort:** S

### P3 — Signaalbadges dragen geen gewicht

**Geschonden:** Visual representations
**Bewijs:** alle signalen zijn `variant="outline"` in `LeadCard.tsx:42`, terwijl
`dev-vacature zonder design` 30 punten weegt en `recente groei` 20.
**Effort:** S

### P3 — "Min. score" is ambigu tussen de tabbladen

**Geschonden:** Words
**Bewijs:** hetzelfde label filtert op de vacaturescore in het ene tabblad en op de leadscore in
het andere. Twee verschillende schalen met verschillende betekenis, één label.
**Effort:** S

---

## Redesign-voorstellen

### 1. Maak de lead herleidbaar

**Huidige issues:** P1 hierboven — Findable 2, Credible 4 (met een gat), Effectiveness 3.

**Voorstel.** Sla per lead op waarop hij rust en toon dat op de kaart, met een doorklik naar de
onderliggende vacatures.

```
┌──────────────────────────────────────────────┐
│ 🏢 Smals                                  75 │
│    dev-vacature zonder design                │
│    digital product team · recente groei      │
│                                              │
│    8 vacatures · 0 design · 5 dev            │
│    → toon deze vacatures                     │
│    BRU                          Nieuw ▾      │
└──────────────────────────────────────────────┘
```

De cijfers bestaan al in `Bedrijfsprofiel`; ze hoeven alleen mee opgeslagen te worden in
`companies` (drie integer-kolommen) en de doorklik is een filter op bedrijfsnaam in het
vacature-tabblad.

**Verwacht effect:** Findable 2→4, Credible 4→5, Effectiveness 3→4. En het maakt de
dekkingsindicator af: die zegt nu *hoeveel* er geclassificeerd is, dit zegt *welke*.
**Effort:** M

### 2. Eén zoekveld

**Huidige issues:** P1 — Findable 2, Efficiency 2.

Een tekstveld in de FilterBar dat op titel en bedrijfsnaam filtert, client-side (alle rijen
staan toch al in de payload). Plus een sorteerkeuze: score, datum, bedrijf.

```
┌─ Regio ─────────────────────────────────────────────────────┐
│ ☑ WVL ☑ OVL ☑ BRU   [🔍 zoek op titel of bedrijf      ]     │
│ Alle statussen ▾    Sorteer: score ▾      Min. score ──○ 0  │
└─────────────────────────────────────────────────────────────┘
```

**Verwacht effect:** Findable 2→4, Efficiency 2→4. Samen met voorstel 1 verdwijnt het grootste
frictiepunt van de app.
**Effort:** S

### 3. Voortgang per regio tijdens een sync

**Huidige issues:** P2 — Time 3.

`sourceStatuses` bevat al per bron de telling en de waarschuwingen. Een sync duurt ~12s en
loopt serieel per regio; die voortgang is er dus al, hij wordt alleen niet getoond.

```
⟳ Bezig…  WVL ✓ 26   OVL ✓ 111   BRU ⟳
```

**Verwacht effect:** Time 3→4, Behavior 3→4.
**Effort:** M — vraagt streaming of polling, want de huidige route antwoordt pas aan het eind.

---

## Research-aanbevelingen

Dit is een expert-review, geen gebruikersonderzoek. Wat de aannames zou toetsen, in volgorde
van waarde:

1. **Eén sessie hardop denken met Jeroen zelf**, met de echte taak: "vind drie bedrijven die je
   deze week zou benaderen". Dat toetst voorstel 1 en 2 in één keer — en Jeroen is hier de
   volledige doelgroep, dus n=1 is representatief.
2. **Een week logboek**: welke leads heb je aangeklikt, welke genegeerd, en waarom. Dat is de
   enige manier om te weten of de signalen kloppen; de audit kan alleen zien dát ze getoond
   worden, niet of ze waar zijn.
3. **Toetsenbord-doorloop met een schermlezer** (VoiceOver). Ik kon Tab niet aandrijven — zie
   de limieten hieronder — dus de toetsenbordvolgorde is ongemeten.

---

## Methodiek en limieten

Dit is een expert-review op basis van het IxDF-framework, uitgevoerd op een draaiende build met
echte data. Geen gebruikersonderzoek, geen analytics: er zijn geen gebruiksdata en die zijn ook
nergens uit af te leiden.

**Wat gemeten is:** contrast (sweep over alle tekstelementen tegen hun effectieve achtergrond),
toegankelijke namen, doelgroottes, kopstructuur, landmarks, `lang`, horizontale overflow, de
aanwezigheid van focus-visible-regels, en de rendering van beide schermen met 327 vacatures en
26 leads.

**Wat niet gemeten kon worden, en dus als leemte staat:**

- **Responsive gedrag.** Het venster verkleinen veranderde de viewport niet
  (`innerWidth` bleef 1417 bij een venster van 686), dus smalle breekpunten zijn ongetest. Dit
  is dezelfde leemte die in `briefings/2026-08-10-component-dekkingsindicator.tcebc.md` al als
  "by construction afgevinkt" staat. Te dichten door de flow-harness op meerdere
  viewportbreedtes te laten renderen.
- **Toetsenbordvolgorde en focusvolgorde.** Tab-toetsen bereikten de pagina niet via de
  automatisering; `activeElement` bleef `BODY`. De focus-*stijlen* zijn wel uit de stylesheets
  afgelezen, de *volgorde* niet.
- **Loading- en error-states.** Er is geen fixture-laag om ze op te wekken; dat staat als gat in
  `apps/jobradar/CLAUDE.md` onder "State forceren".

**Aannames, expliciet gemarkeerd:**

- `[ASSUMPTION]` Persona = Jeroen zelf: freelance UX/UI-designer, hoog tech-niveau, gebruikt de
  app op desktop, wekelijks tot dagelijks, met als taak "wie kan ik deze week benaderen". Er is
  geen tweede gebruiker, dus generalisatie is niet aan de orde — maar dat maakt de audit ook
  blind voor onboarding-problemen die een nieuwe gebruiker wél zou raken.
- `[ASSUMPTION]` Desktop-first is bewust, conform de briefings. Mobiel is niet in scope en is
  daarom niet zwaarder gewogen dan de doelgroottes rechtvaardigen.
- `[GEEN DATA]` Geen analytics, geen support-tickets, geen eerdere gebruikersfeedback.

**Bias om te benoemen:** ik heb het grootste deel van deze code zelf geschreven, vandaag. Een
auditor die zijn eigen werk beoordeelt ziet zijn eigen beslissingen als vanzelfsprekend. De
contrastfout in de dekkingsindicator is mijn eigen toevoeging van een paar uur geleden, en die
had ik zonder de meting niet gezien. Waar deze audit mild is, is dat de waarschijnlijkste
verklaring.
