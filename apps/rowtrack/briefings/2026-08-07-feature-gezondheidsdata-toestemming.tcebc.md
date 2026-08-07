# Toestemming voor gezondheidsgegevens

- **Datum:** 2026-08-07
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gebouwd

---

```
TASK:        De gebruiker geeft uitdrukkelijk toestemming vóór RowTrack hartslag- en
             lichaamsgegevens verwerkt, en kan die toestemming even makkelijk intrekken.

CONTEXT:     Het privacybeleid noemt uitdrukkelijke toestemming (AVG art. 9.2.a) als grondslag
             voor hartslag, gewicht, lengte, geboortedatum en geslacht. Dat moment bestaat nog
             niet in de app, dus het beleid beschrijft vandaag iets wat feitelijk niet klopt.
             Toestemming moet vrij, specifiek, geïnformeerd en ondubbelzinnig zijn: geen
             voorgevinkt vakje, geen "door de app te gebruiken ga je akkoord", en de app moet
             bruikbaar blijven als je nee zegt — anders is ze niet vrij gegeven.

ELEMENTS:    Toestemmingsscherm (eenmalig, na inloggen) met uitleg + link naar het beleid +
             twee gelijkwaardige keuzes · schakelaar "Gezondheidsgegevens" in Profiel ·
             kolom op `profiles` die de keuze en het tijdstip vastlegt.

BEHAVIOUR:   Geen keuze vastgelegd → scherm verschijnt na inloggen, ook voor bestaande accounts.
             Ja → hartslagmeter koppelbaar, lichaamsvelden invulbaar, calorieën op je gewicht.
             Nee → de app werkt gewoon: ritten worden opgeslagen zonder hartslag, calorieën op
             een standaardgewicht, lichaamsvelden verborgen. Later alsnog omschakelen kan in
             Profiel, beide richtingen.

CONSTRAINTS: iPhone portrait · bestaande BottomSheet/Button/Segmented-bouwstenen · rol-tokens
             only · NL copy via `t.*` · geen nieuwe dependency · de keuze staat op `profiles`
             (server-side, niet lokaal) zodat ze een herinstallatie overleeft · migratie draait
             Jeroen handmatig in de SQL Editor.
```

---

## Open vragen

Geen. Beantwoord op 2026-08-07:

1. **Eigen scherm ná inloggen** — dekt nieuwe én bestaande accounts in één keer.
2. **Bestaande accounts krijgen het scherm ook.** De 11 ritten met hartslag krijgen daarmee alsnog
   een grondslag, in plaats van te blijven staan zonder.
3. **Intrekken wist wat er al is** — hartslag uit alle ritten, plus de lichaamsvelden.
4. Zonder toestemming blijft de app volledig bruikbaar (niet apart gevraagd; het voorstel is
   gebouwd zoals beschreven).

## Aannames

- `[ASSUMPTION: eigen scherm, niet in het registratieformulier]` — een vinkje tussen de velden van
  een registratieformulier haalt de lat van "specifiek en geïnformeerd" moeilijk, en werkt sowieso
  niet voor de bestaande accounts. Eén scherm dekt beide gevallen.
- `[ASSUMPTION: twee gelijkwaardige knoppen]` — geen groot-groen-ja tegenover een grijs linkje.
  Een keuze die visueel gestuurd wordt, is geen vrije keuze.
- `[ASSUMPTION: kolom `health_consent_at timestamptz` + `health_consent_version text`]` — het
  tijdstip is nodig om aan te tonen wanneer toestemming gegeven is; de versie zodat een latere
  wezenlijke wijziging van het beleid opnieuw gevraagd kan worden. `null` = nog niet gevraagd,
  wat iets anders is dan geweigerd — daarvoor een aparte waarde.
- `[ASSUMPTION: geen Figma-design]` — dit scherm bestaat niet in Figma; zelfde dekkingsgat als de
  auth-schermen. Gebouwd op bestaande patronen, achteraf te syncen.

## Acceptatie

- [x] Zonder vastgelegde keuze verschijnt het toestemmingsscherm ná inloggen, vóór de gebruiker
      bij zijn gegevens kan — ook op een bestaand account.
- [x] Het scherm benoemt concreet wélke gegevens het betreft (hartslag per seconde, gewicht,
      lengte, geboortedatum, geslacht) en waarvoor ze gebruikt worden.
- [ ] Er staat een werkende verwijzing naar het privacybeleid. → *de link staat er
      (`lib/links.ts`), maar wijst naar umanex.be/rowtrack/privacy — die pagina moet nog live.*
- [x] Ja en nee zijn visueel gelijkwaardig; er is niets voorgevinkt.
- [x] **Nee** laat de app volledig werken: een rit start, wordt opgeslagen en getoond, met
      afstand, tijd, vermogen, split en doelen.
- [x] **Nee** betekent ook echt niet verzamelen: geen hartslag in `workouts.samples`, geen
      `avg_heart_rate`/`max_heart_rate`, geen lichaamsvelden op `profiles`.
- [x] De hartslagmeter is niet koppelbaar zonder toestemming, met uitleg waarom.
- [x] De lichaamsvelden in Profiel zijn verborgen of geblokkeerd zonder toestemming.
- [x] **State loading:** het scherm wacht op de opgeslagen keuze en flitst niet even verkeerd.
- [x] **State error:** faalt het opslaan van de keuze, dan blijft het scherm staan met een melding —
      geen stille aanname dat er toestemming is.
- [x] Intrekken kan in Profiel, in één handeling, zonder uitleg te moeten geven.
- [x] De keuze overleeft opnieuw inloggen en een herinstallatie (staat op `profiles`, niet lokaal).
- [x] Het tijdstip van de toestemming wordt vastgelegd.
- [x] Geen hardcoded kleur/spacing/fontgrootte; alle copy via `t.*`.
- [x] `tsc --noEmit` groen.

**Waarom nog niet `gevalideerd`.**

*Bijgewerkt 2026-08-07 na de eerste `verify`-run.* De migratie **is** intussen gedraaid — dat deel van
de blokkade is weg. Live op `profiles`: `health_consent` (met de check-constraint en de kolom-comment
uit het migratiebestand), `health_consent_at`, `health_consent_version`, plus de functie
`revoke_health_consent()`.

Wat de backend-as runtime bewees:

- **Auth-guard van `revoke_health_consent()` houdt.** De functie is zonder ingelogde gebruiker
  aangeroepen; daarna stonden alle 11 ritten met `avg_heart_rate`/`max_heart_rate` en de 9 ritten met
  hartslag in `samples` er onveranderd, en de lichaamsvelden waren nog gevuld. `auth.uid()` uit een
  argument halen zou hier een wisfunctie voor andermans data zijn — dat kan niet.
- **De strip-logica klopt.** `[[0,0,120],[1,10,125],[2,21,130]]` → `[[0,0],[1,10],[2,21]]`: hartslag
  eruit, tijd en afstand intact.
- **Rechten zijn dicht.** `EXECUTE` staat op `postgres`, `authenticated`, `service_role`; `anon` en
  `public` staan niet in de ACL. `SECURITY DEFINER` bevestigd.
- **`tsc --noEmit` groen** (exit 0).

Wat de as *deed* falen:

- **De privacybeleid-link is dood.** `PRIVACY_POLICY_URL` (`lib/links.ts`) wijst naar
  `https://umanex.be/rowtrack/privacy` — vandaag HTTP **404**, met en zonder `www`. Toestemming die
  verwijst naar een onbereikbaar beleid is niet "geïnformeerd"; dit is het enige item dat het contract
  aantoonbaar schendt.

Wat **niet** verifieerbaar was, en waarom: elk item dat door de UI loopt (scherm verschijnt na
inloggen, gelijkwaardige knoppen, verborgen lichaamsvelden, koppelknop hartslagmeter, loading/error,
intrekken in Profiel, keuze overleeft heropstart). Er is geen pad om een flow af te leggen: de
dev-client op de simulator dateert van 10 juli — een maand vóór deze feature — er draait geen Metro,
en er is geen manier om te tappen. De vinkjes bij die items komen uit de bouwstap en betekenen
*gebouwd*, niet *geverifieerd*; onder de `verify`-skill hoort `- [x]` het tweede te betekenen. Die
baseline-beslissing staat open.

Blokkeert `gevalideerd`: de dode beleid-link (P1) plus de niet-afgelegde flow.

## Beslissingsgeschiedenis

- 2026-08-07: aangemaakt. Volgt op het privacybeleid, dat toestemming als grondslag noemt voor
  gegevens die de app vandaag zonder toestemming verzamelt.
