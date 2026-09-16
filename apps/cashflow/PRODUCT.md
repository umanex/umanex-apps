# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Eén gebruiker: Jeroen, zelfstandig UX/UI designer (vijftien jaar ervaring) die onder het label
umanex werkt. Hij gebruikt de app op zijn eigen machine, ingelogd, om twee jobs te doen:

- **Zijn geld zien aankomen** — de maandprognose: wat komt binnen, wat gaat eruit, wat staat
  opzij in potten, en hoe diep de buffer staat, drie maanden vooruit en terugkijkend.
- **Zijn bedrijf sturen** — het Bureau-gedeelte: beslissen of hij meer moet verkopen, of een
  nieuwe opdracht in zijn tijd past, of projecten genoeg opleveren, of scope of prijs bij moeten,
  wanneer een cashtekort ontstaat en of hij te afhankelijk wordt van één klant.

Niemand anders ziet de app. Er is geen klant-, boekhouder- of freelancertoegang.

## Product Purpose

Een persoonlijke cashflow-prognose die uitgebreid is tot intern bedrijfsdashboard. Succes is dat
Jeroen elke beslissing hierboven kan nemen op cijfers waarvan hij de herkomst kan nagaan: elk
bedrag draagt zijn berekening, zijn noemer en zijn bron, en ontbrekende gegevens lezen als
onzekerheid in plaats van als nul.

## Positioning

umanex is een **design team of one**: van research tot interactief prototype, met een sterke
focus op AI, geleverd als afgebakende designtrajecten tegen vaste prijs in plaats van
uurtje-factuurtje. umanex-os, het eigen werksysteem, ondersteunt de uitvoering.

_Afwijking, bewust vastgelegd (Jeroen, 2026-09-16):_ het umanex-profiel in umanex-os
(`profiles/umanex.md`, 24 augustus 2026) noemt deze positionering vervallen ten gunste van
"designteam voor softwarebedrijven met meer producten dan designers". Voor deze app geldt de
formulering hierboven; het profiel is daarmee niet aangepast.

## Operating Context

- Draait lokaal als productie-build onder PM2 op `127.0.0.1:3000`, light-only, één scherm.
- Alle gegevens staan in één Supabase-document per gebruiker (`cashflow_state.data`) plus
  bevroren maandsnapshots; wijzigingen syncen als geheel met revisiecontrole.
- De maandprognose werkt per maand (`yyyy-MM`); het Bureau voegt dagen, ISO-weken, kwartalen en
  boekjaren toe bovenop dezelfde gegevens.
- Inkomsten in de maandprognose zijn btw-inclusief; omzet in het Bureau is exclusief btw. Btw staat
  als spaarpot "BTW", niet als rekenmodel.
- Een inkomst die binnen is, verwijdert of verplaatst Jeroen uit de prognose; wat er staat is nog
  te ontvangen.
- Freelancers leveren mee, maar hun uren zijn kosten, geen eigen capaciteit. Agent-looptijd telt
  niet als werktijd.

## Capabilities and Constraints

- **Maandprognose** (bestaand): inkomsten, vaste en eenmalige uitgaven, maandbudgetten en provisies,
  een bufferpot die tekorten opvangt, maandafsluiting, analyse (runway, waterfall, bufferstand,
  begroot tegenover werkelijk).
- **Bureau** (nieuw): doelen per boekjaar, projecten met mijlpalen, facturen en externe kosten,
  tijdregistratie en planning, lichte verkoopregistratie, klantconcentratie, 13-wekencashplanning en
  instelbare signalen.
- **Aanbodtypes:** Productdiagnose (de scan), Conceptvalidatie, Workflowtraject, Design system,
  Productbegeleiding, Overig. Verkoopprijzen en tijdsbudgetten uit het bedrijfsplan zijn hypotheses
  en worden nergens hardgecodeerd.
- **Capaciteit in dagen per maand** wordt geregistreerd als project (typisch Productbegeleiding) met
  één mijlpaal per maand; doorrol van dagen wordt niet apart bijgehouden.
- **Omzet is managementregistratie**, geen boekhoudkundige omzet: een mijlpaal is gerealiseerd of
  niet. Een voorschot is geen omzet, een betaling voegt geen omzet toe, een voorstel is geen getekend
  werk.
- **Startwaarden 2027** (omzetdoel € 200.000 ex btw, 200 eigen dagen waarvan 128 klantwerk, 40
  verkoop, 12 umanex-os, 10 administratie, 10 buffer; max. 30 % per klant; 8 u per dag; kwartalen
  40/55/45/60 k) zijn bewerkbare aannames, geen regels.
- **Maandelijkse cashbehoefte ± € 11.000** is een onvoldoende uitgesplitste aanname; ze wordt naast
  de geregistreerde uitstroom gezet, nooit erbovenop geteld.
- EUR als enige valuta. Geen e-mail, geen berichten, geen contact met prospects vanuit de app.
- Geen dark mode (beslissing 2026-08-08).

## Evidence on Hand

- Jeroens echte cashflowdocument in Supabase (één gebruiker, geen testaccount); verificatie gebeurt
  op fixtures in de flow-harness, nooit met schrijfacties op dat document.
- Het bedrijfsplan *umanex 2027* (artifact `0d79a364-bbcd-4880-8829-1d254d92bb78`) en
  `scripts/plan-model.mjs` bevatten hypotheses, geen gerealiseerde cijfers.
- Er bestaan nog géén projecten, facturen, uren of kansen in de app: elk scherm moet eerlijk leeg
  kunnen zijn, zonder voorbeeldcijfers tussen echte gegevens.

## Product Principles

1. **Elk getal kan zijn herkomst tonen.** Noemer, bron en berekening zijn deel van het getal.
2. **Onbekend is geen nul.** Ontbrekende gegevens lezen als "onvoldoende gegevens", met wat er
   ontbreekt en waar je het invult.
3. **Eén bron per feit.** Geen tweede klant-, factuur- of transactieregistratie naast een bestaande;
   de weekplanning is een verdeling van de maandprognose, geen tweede rekenkern.
4. **Niets telt twee keer.** Gerealiseerd en resterend, factuur en betaling, besteed en gepland,
   reservering en vrije cash zijn per constructie gescheiden.
5. **Aannames zijn zichtbaar en bewerkbaar.** Doelen, drempels en startwaarden corrigeren zichzelf
   nooit stil; afwijkingen worden getoond.

## Accessibility & Inclusion

WCAG AA-contrast (gemeten in CI), volledige toetsenbordbediening, semantische tabellen met caption en
scope, grafieken met tabelalternatief, geen informatie die alleen via kleur of hover bestaat.
