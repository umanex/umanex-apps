# HANDOFF.md — sessie-handoff (vooruitkijkend)

Dit bestand is de **vooruitkijkende tegenhanger** van `LEARNINGS.md`. Waar LEARNINGS de rauwe vangst van *fouten* is, houdt HANDOFF de open **onzekerheden, aannames, risico's, next steps en ideeën** bij die een sessie achterlaat — zodat een volgende sessie niet koud begint.

Entries komen erbij via de `sessie-reflectie` skill aan het einde van een sessie. De open items worden bij de start van een volgende sessie automatisch getoond via de user-level SessionStart-hook (`~/.claude/hooks/session-start-handoff.sh`). Niet handmatig bewerken tenzij je een status corrigeert.

## Waarom dit bestaat

Aan het einde van een sessie zit de meeste context in het hoofd van Claude en verdampt bij afsluiten: waar was ik het minst zeker over, welke aanname bleef onuitgesproken, wat breekt over 3 maanden, wat is de eerste zet volgende keer. HANDOFF vangt dat expliciet op zodat het meekomt.

Dit is **geen duplicaat van de eval-loop**. Een terugkerende *faalklasse* hoort in `LEARNINGS.md` (via `vastleggen`); een *durend feit* hoort in auto-memory. HANDOFF is enkel voor het vooruitkijkende, sessie-gebonden restant.

## Statussen

- `open` — vastgelegd bij reflectie, nog niet opgepakt. Wordt bij sessiestart getoond.
- `resolved` — opgepakt of beantwoord in een latere sessie; blijft staan als spoor, wordt niet meer getoond.

## Types

`onzekerheid` · `aanname` · `risico` · `next-step` · `idee` · `debt`

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

    ## YYYY-MM-DD — {korte titel} · [{type}]
    - **Bevinding:** {1-2 zinnen}
    - **Volgende zet:** {concreet actiepunt of "-"}
    - **Status:** open

<!-- De sessie-reflectie skill voegt hieronder de juiste laag-header toe bij de eerste entry. -->

# Project — jobradar

## 2026-08-26 — De UAT-key ligt bij Jeroen en blokkeert alles erachter · [next-step]
- **Bevinding:** De hele prospect-trechter hangt aan het personeelsbestand uit de NBB, en dat vraagt een subscription key — ook op de testomgeving. Gemeten deze sessie: 401 `missing subscription key` zonder header, 401 `invalid subscription key` met een verzonnen waarde. De UAT-key is gratis en vraagt geen contract, maar de registratie staat op Jeroens naam en kan niet door een sessie gedaan worden. De productiesleutel is aangevraagd en nog niet ontvangen.
- **Check:** `grep -c NBB_CBSO_KEY= apps/jobradar/.env.local` — 0 betekent dat de key er nog niet is en dit item nog leeft; is hij er wel, dan is `node --import ./scripts/ts-resolve.mjs scripts/nbb-probe.ts` de eerstvolgende handeling.
- **Volgende zet:** Registreren op https://developer.uat2.cbso.nbb.be/, abonneren op *NBB CBSO Web Services - Authentic Data* (de portal-naam; de NBB-website noemt hetzelfde product "Authentic Data Query"), primary key in `.env.local` met `NBB_CBSO_OMGEVING=uat`. Daarna de probe draaien.
- **Status:** open

## 2026-08-26 — Niemand weet of de UAT echte bedrijven bevat · [onzekerheid]
- **Bevinding:** De UAT-key ontgrendelt de verificatie van het pad, maar mogelijk niet de data. De NBB-documentatie zegt nergens of `ws.uat2.cbso.nbb.be` echte Belgische jaarrekeningen draagt of verzonnen testbedrijven; de technische gids gebruikt voorbeeldnummers (0403101811, 0403834160) zonder te zeggen wat ze zijn. Bevat de UAT testdata, dan werkt het pad straks aantoonbaar terwijl de echte lijst nog altijd op de productiesleutel wacht — en dan is "de probe is groen" géén bewijs dat de trechter kan draaien.
- **Check:** Draai `scripts/nbb-probe.ts` op een ondernemingsnummer waarvan de naam bekend is (bv. 0406798006 = Smals, uit de eigen vacaturedata) en kijk of `EnterpriseName` in de respons die naam teruggeeft. Echte naam = productiedata in de UAT; niets of een verzonnen naam = testdata.
- **Volgende zet:** Deze check draaien in dezelfde sessie als de eerste geslaagde probe, vóór er conclusies aan de groene uitkomst gehangen worden.
- **Status:** open

## 2026-08-26 — Per onderneming of per dag: de route is nog niet gekozen · [aanname]
- **Bevinding:** Er zijn twee wegen naar hetzelfde cijfer. Per onderneming (wat `nbb.ts` nu doet) is twee verzoeken per bedrijf, dus tot 31.450 calls voor de 15.725 KBO-kandidaten. Het Extracts-product heeft `GET /batch/{date}/references` en `/batch/{date}/accountingData`, dus een jaar aan werkdagen is ~250 calls — maar dan haal je heel België binnen en filter je zelf. Welke goedkoper is hangt af van quota en payloadgrootte, en geen van beide is bekend zonder key. De default staat op per-onderneming omdat die eenvoudiger is, niet omdat hij bewezen beter is; dat staat zo in de kop van `lib/sources/nbb.ts`.
- **Check:** `grep -n "TWEE ROUTES" apps/jobradar/lib/sources/nbb.ts` — staat de notitie er nog, dan is de keuze nog niet gemaakt. Verdwenen = iemand heeft gekozen en hoort dat hier af te sluiten.
- **Volgende zet:** Zodra de key er is: meet de responsgrootte van één `batch/{date}/references` en lees de quota in de portal, vóór de filter op `kbo-import.ts` gebouwd wordt.
- **Status:** open

## 2026-08-26 — De classificatie-as mist "te klein" · [onzekerheid]
- **Bevinding:** Het labelscherm kent vijf uitkomsten — product · dienstverlener · beide · geen-prospect · twijfel. De dimensie die de NBB-filter moet wegnemen (20-150 werknemers) heeft er geen. Zolang die filter ontbreekt, komt de grootte-vraag tijdens het labelen bovendrijven en verdwijnt ze in `geen-prospect`, samen met de dienstverleners — waarmee precies het onderscheid wegvalt dat de briefing wil meten. 44% van de 15.725 kandidaten is opgericht sinds 2021, dus dit is geen randgeval.
- **Check:** `node -e "const {CLASSIFICATIES}=require('...')"` gaat niet (TS), dus: `sed -n '/export const CLASSIFICATIES/,/as const/p' apps/jobradar/lib/db/schema.ts` — vijf waarden = dit item leeft nog, een zesde die over grootte gaat = het is opgelost. De lijst staat in `schema.ts`, niet in `lib/prospects.ts`; dáár zoeken geeft nul treffers en dat leest ten onrechte als "opgelost".
- **Volgende zet:** Beslissen wanneer de NBB-filter er is. Komt hij er snel, dan is dit vanzelf weg. Duurt het langer, dan is een zesde waarde de manier om nu al te labelen zonder de marktomvang-meting te vervuilen — dat was het alternatief dat op 2026-08-26 op tafel lag en niet gekozen werd.
- **Status:** open

## 2026-08-26 — PR #327 staat open als draft en is bewust niet merge-klaar · [risico]
- **Bevinding:** De prospect-tak stond tot deze sessie uitsluitend op één lokale schijf — elf commits, 3.874 regels, nergens op `origin`. Dat is nu rechtgezet: gepusht, main erin gemerged, CI groen. De PR blijft draft omdat de acceptatielijst in de briefing volledig op `- [ ]` staat en de import nog niets wegschrijft. Het risico is niet langer dataverlies maar vergeten: een draft-PR die maanden blijft hangen terwijl main doorloopt, loopt opnieuw achter.
- **Check:** `gh pr view 327 --json isDraft,state -q '"\(.state) draft=\(.isDraft)"'` plus `git rev-list --count origin/feature/prospect-classificatie..origin/main` — een groeiend getal is het signaal om main er weer in te trekken.
- **Volgende zet:** Bij elke werksessie aan deze tak eerst `gh pr update-branch 327` draaien. De draft-status blijft tot de acceptatie-items van `briefings/2026-08-24-feature-prospect-labeling.tcebc.md` afgevinkt zijn op bewijs.
- **Status:** open
