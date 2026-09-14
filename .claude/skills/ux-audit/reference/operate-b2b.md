# Operate — de B2B-laag die de drie frameworks missen

De IxDF-frameworks zijn productneutraal en de enige platformlijst in `SKILL.md` is consumenten-mobiel (bottom-tabbar, camera, GPS). Alle Luminus- en Columba-apps zijn kantoorsoftware: de gebruiker zit in een taak, niet in een beslissing. Dit bestand is die laag.

**Wanneer.** Bij modus `operate`. Is het oppervlak `persuade` (landing, verkoopspagina) of `read` (voorwaarden, docs), schrijf dan `Operate-checklist n.v.t. — <modus>` en sla hem over; de lijst dwingt daar gewoontes af die er niet horen.

**Hoe te rapporteren.** Elk item is een telling of een waarneming met bewijs, geen indruk. Wat je niet bekeek staat als `[NIET BEKEKEN]`, niet stil.

---

## 1 · Toestanden per component

Het vertrekpunt van `CLAUDE.md` — *states zijn default, geen optie* — uitgebreid naar de interactie-toestanden die een audit op een gebouwd scherm kan zien.

- Per interactief component: **default · hover · focus · active · disabled · loading · error** — tel `n/7` en noem welke ontbreken.
- Per datagedreven gebied: **loading · empty · error**. Een skeleton op de plek van de content, geen spinner in het midden; een lege staat die de uitweg noemt, niet "geen resultaten".
- Meet de toestanden die je niet kunt opwekken niet weg: `[NIET GEZIEN — niet op te wekken zonder testdata]`.

Deze klasse keert in de rapporten het vaakst terug: over vier apps en twee klanten dragen de bevindingslijsten telkens 2 tot 9 items uit deze categorie. Keert ze terug in een tweede audit van dezelfde app, dan is dat de `vastleggen`-trigger — dan faalt het werkprincipe, niet het scherm.

## 2 · Consistentie over de schermen

- Eén knopvorm, één form-control-vocabulaire, één icoonstijl. *Ziet de opslaan-knop er op twee plekken anders uit, dan is er één fout.*
- Eén semantisch kleurvocabulaire voor toestand: hover, focus, active, selected, disabled, loading, error, warning, success, info.
- Accentkleur voor primaire acties, huidige selectie en toestand — niet voor decoratie.

## 3 · Tabellen en lijsten (het patroon dat B2B draagt)

- **Tabelvoet**: teller (`N van M`), paginering, sortering, rijen-per-pagina. Een tabel zonder teller verbergt hoeveel er níet staat.
- **Filters**: zichtbaar welke actief zijn, een "wis alles", en een lege staat die zegt welk filter het veroorzaakte.
- **Bulk-acties en export**: is de scope expliciet (deze pagina of de hele selectie)?
- **Kolomkiezer** en kolombreedtes bij brede datasets; dichtheid mag hier — tabellen op 120ch+ zijn prima, prose blijft 65–75ch.
- **Terugweg**: breadcrumb of terug-knop die de filterstaat behoudt. Filterstaat die bij terugkeer weg is, is een bevinding.

## 4 · Formulieren

Een multi-step formulier is de kern van meerdere klant-apps; dit is de checklist die zes rapporten ad hoc bij elkaar zochten.

- **Verplicht-conventie**: één regel voor het hele formulier (markeer verplicht óf optioneel, niet allebei) plus een legenda. Meet: hoeveel velden wijken af.
- **Validatiemoment**: inline bij verlaten van het veld, of pas bij verzenden — en is dat consistent?
- **Foutmelding-inventaris**: per veld — noemt de melding het probleem én de oplossing? Tel `n van N velden` met een bruikbare melding.
- **Bewaren en hervatten**: wat gebeurt er bij wegklikken, sessie-timeout of een refresh halverwege?
- **Voorvullen**: `autocomplete`, `inputmode`, en formaten die de gebruiker niet hoeft te raden.
- **Destructieve acties** met bevestiging die benoemt wat er verdwijnt.
- **Tekstexpansie**: labels en knoppen NL → FR groeien ~30 %. Meet de langste vertaling, niet de Engelse bron.

## 5 · Overlays, focus en tijd

- Een dropdown, tooltip of popover binnen een `overflow: hidden|auto`-voorouder wordt afgeknipt. Controleer de voorouderketen, niet alleen het beeld.
- Modaal alleen wanneer de taak onderbreking óf beschermde focus nodig heeft; anders inline of progressief.
- Transities 150–250 ms. Geen page-load-choreografie: een werkscherm laadt in een taak, niemand wil ernaar kijken.
- Sessie-timeout: wordt onopgeslagen werk gered of aangekondigd?

## 6 · Dichtheid en toetsenbord

- Dichtheid is hier een deugd, geen gebrek: power-users willen meer rijen, niet meer wit.
- Toetsenbordpad door de hoofdtaak zonder muis, in leesvolgorde, met zichtbare focus. Shortcuts zijn een plus, geen eis.
- Standaardpatronen (topbar + zijnav, breadcrumbs, tabs) verslaan hier originaliteit: herkenbaarheid ís de functie.

---

De lijst is overgenomen (niet gelinkt) uit de documentatie van de `impeccable`-skill, Operate-modus. Bewust overgetikt: die bestanden worden door `npx impeccable update` overschreven, dus een verwijzing ernaartoe zou stil kunnen verdwijnen.
