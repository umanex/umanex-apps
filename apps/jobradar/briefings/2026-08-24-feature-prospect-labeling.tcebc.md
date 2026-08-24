# TC-EBC — Prospect-labeling

| | |
|---|---|
| **Datum** | 2026-08-24 |
| **Type** | feature |
| **Project** | umanex-apps — nieuwe app óf uitbreiding van `apps/jobradar` (open vraag 1) |
| **Klant** | umanex (eigen werk) |
| **Status** | gepland |

---

```
TASK:        Een lijst Belgische bedrijven één voor één labelen als productbedrijf,
             dienstverlener of geen prospect, snel genoeg om er ~545 in één werkdag
             door te krijgen, met de website van het bedrijf ernaast als bewijs.

CONTEXT:     Eerste stap van het bureau-plan 2027. Eurostat geeft 631 Belgische
             ondernemingen in NACE J62+J63+J58.2 met 20-249 werknemers, ~545 in de
             band 20-150. Geen enkele Belgische bron splitst product versus
             dienstverlening — dat cijfer moet handmatig gemaakt worden. De uitkomst
             is tegelijk de marktomvang én de prospectlijst voor de scan-outreach in
             Q4 2026. Zonder deze lijst is er geen kanaal en dus geen plan.

ELEMENTS:    Voortgangsbalk (gelabeld / totaal) · focuskaart met bedrijfsnaam, NACE,
             werknemersklasse, plaats en website-URL · ingebedde website-preview of
             externe link · labelknoppen (product / dienstverlener / geen prospect /
             twijfel) · signaalvinkjes (meerdere producten, eigen designer zichtbaar,
             publieke repo) · vrij notitieveld · overslaan · terug · filterbalk op
             status · exportknop.

BEHAVIOUR:   Toetsenbord-eerst: cijfertoetsen labelen, pijl links gaat terug, spatie
             slaat over. Elke label slaat direct op en schuift door naar het volgende
             bedrijf; geen bevestigingsstap. Sessie is hervatbaar — sluiten en later
             verdergaan op dezelfde plek. Twijfel-label parkeert een bedrijf op een
             aparte stapel voor een tweede ronde. Export levert de gelabelde lijst
             plus de telling per categorie.

CONSTRAINTS: Desktop-only, dit is een werkinstrument voor één gebruiker. Geen auth in
             v1 — lokaal draaiend. Uitsluitend rollaag-utilities uit
             @umanex/config/tailwind/preset, geen rauwe paletklassen of hex. Lucide
             iconen. Light + dark. Data blijft lokaal (SQLite of JSON in .data/),
             geen externe dienst. Doorlooptijd van één bedrijf onder 45 seconden —
             dat is de eigenlijke ontwerpeis.
```

---

## Open vragen

1. ~~**Architectuur — nieuwe app of jobradar uitbreiden?**~~ **BESLIST 2026-08-24 op basis van code-inspectie: uitbreiden in `apps/jobradar`.** De `companies`-tabel draagt al `nace_code`, `url`, `signals`, `lead_status`, `rechtsgrond` en `opt_out`; `lib/sources/kbo.ts` is een werkende stub binnen de `LeadSource`-abstractie met een gedocumenteerd live-pad dat nooit gebouwd is. De 26 bestaande rijen komen allemaal uit `vacatures` en hebben `nace_code` en `url` leeg — de kolommen zijn er voor precies deze tak. Een zesde app zou een tweede database, een tweede UI-bedrading, een tweede flow-harness en een tweede verify-pad betekenen voor een model dat voor 80% al bestaat. De bredere "centrale hub voor de uitbouw van het bedrijf" (pipeline, retainers, plan-KPI's) past niet in jobradars scope en is een **aparte beslissing, uitgesteld tot er een tweede retainer loopt** — geen hub bouwen voor een bedrijf dat nog niet bestaat.
2. **Bronlijst — de website-kolom is het echte gat.** KBO Open Data (maandelijkse volledige dump, gratis) levert ondernemingsnummer, benaming, adres en NACE-codes, maar **géén werknemersaantallen en géén websites**. Werknemersaantallen zitten in de NBB-jaarrekeningen. De website staat in geen van beide bronnen — en dat is precies het veld waar de hele tool op draait, want labelen gebeurt door naar de site te kijken. Nog te beslissen: URL afleiden via zoekopdracht bij de import, of manueel opzoeken ín de tool (wat de 45-secondeneis onder druk zet).
3. **Component-typologie** — focuskaart één-voor-één (aanname, want snelheid is de ontwerpeis), of een dichte tabel met inline acties, of een split-view met lijst links en detail rechts?
4. **States** — loading, empty en error staan default aan. Welke vallen af? Bij een lokale JSON-import is loading vermoedelijk verwaarloosbaar en error beperkt tot een kapot importbestand.
5. **Interactie-modaliteit** — toetsenbord-eerst is de aanname omdat 545 records met de muis onwerkbaar traag is. Bevestigen of afwijzen.
6. **Edge cases** — welke gelden: geen website, website onbereikbaar, bedrijf doet allebei (product én dienstverlening), dubbele inschrijving, bedrijf bestaat niet meer, halverwege stoppen en hervatten?

## Aannames

- `[ASSUMPTION: desktop-only, één gebruiker, geen auth in v1 — dit is een intern werkinstrument, geen product]`
- `[ASSUMPTION: de website-preview gebeurt via een externe link in een tweede tabblad in plaats van een iframe — veel sites blokkeren framing met X-Frame-Options, en een stille lege iframe is erger dan een link]`
- `[ASSUMPTION: umanex-DNA, dus @umanex/tokens en de gedeelde preset — geen project-eigen tokenset zoals RowTrack die heeft]`
- `[ASSUMPTION: data lokaal in .data/, gitignored — het is bedrijfsdata, geen artefact om te committen]`
- `[ASSUMPTION: labels zijn product / dienstverlener / geen prospect / twijfel; de signaalvinkjes staan daar los van en zijn meervoudig aan te vinken]`

## Harde constraint uit de bestaande code — de derde as

jobradars eigen `CLAUDE.md` documenteert een faalklasse: *"De vacaturescore zegt hoe interessant werk is om zélf te doen; de classificatie zegt of het bedrijf een lead is. Laat die assen niet samenvallen — dat is precies de faalklasse in `LEARNINGS.md`."*

De classificatie product-versus-dienstverlener is een **derde** as en krijgt dus een eigen kolom. Hem in `lead_status` proppen herhaalt exact de fout die daar al vastligt.

| As | Kolom | Waarden |
|---|---|---|
| Pijplijn | `lead_status` (bestaat) | new · saved · dismissed · contacted |
| Aantrekkelijkheid | `lead_score` (bestaat) | 0–100 |
| **Classificatie** | **`classificatie` (nieuw)** | product · dienstverlener · geen-prospect · twijfel · null |

Nieuw nodig in het schema: `classificatie`, `werknemers` (integer, nullable — "nog niet geteld" is niet nul), `geclassificeerd_op` (voor de hervatbare sessie).

## Acceptatie

- [ ] Component-typologie is de gekozen vorm uit open vraag 3, en één bedrijf beslaat één scherm zonder scrollen op 1440×900
- [ ] Loading, empty en error renderen elk aantoonbaar, of zijn expliciet uitgesloten met reden
- [ ] Elk label is met het toetsenbord te zetten zonder muis, en de focus springt zichtbaar mee
- [ ] Een label slaat op zonder bevestigingsstap en overleeft een harde refresh
- [ ] Sessie is hervatbaar: sluiten en heropenen landt op hetzelfde bedrijf
- [ ] Terug-actie corrigeert het vorige label zonder de voortgangstelling te breken
- [ ] Twijfel-stapel is apart opvraagbaar en telt niet mee als afgehandeld
- [ ] Elke benoemde edge case uit open vraag 6 heeft zichtbaar gedrag, geen stille fout
- [ ] Export levert de volledige gelabelde lijst plus de telling per categorie
- [ ] `pnpm --filter @umanex/tokens guard` slaagt — geen rauwe paletklasse, geen hex, geen arbitrary waarde
- [ ] Gemeten op tien echte bedrijven: mediane doorlooptijd onder 45 seconden per bedrijf
- [ ] `## Verify-pad`-sectie staat in de `CLAUDE.md` van de app die dit huisvest

## Beslissingsgeschiedenis

- 2026-08-24: briefing aangemaakt. Scope bewust beperkt tot de labeling-tool; de bredere vraag "één centrale app voor de uitbouw van het bedrijf" is een architectuurbeslissing die als open vraag 1 op tafel ligt en niet stilzwijgend meegebouwd wordt.
