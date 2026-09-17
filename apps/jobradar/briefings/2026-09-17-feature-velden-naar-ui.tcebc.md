# TC-EBC — jobradar-velden naar @umanex/ui

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** jobradar
- **Klant:** umanex
- **Status:** gevalideerd (2026-09-17)

---

```
TASK:        Laat jobradar zijn velden, knoppen en telpillen uit @umanex/ui halen in plaats van ze
             met losse klassen na te bouwen, zonder dat er iets aan het beeld verandert.
CONTEXT:     Plan delightful-stirring-blossom, fase 4b; 4a leverde net de Badge-maat `sm` en de
             Slider-thumbnaam (umanex-apps#529). De critique van 2026-09-17 noemde dit issue 4:
             "formulieren leven naast @umanex/ui, niet erin" — gemeten 49 rauwe velden, 20 rauwe
             knoppen en 7 telpillen. `ds:guard` ziet dit niet: hij zoekt een lokale kópie op naam,
             niet een rauwe `<input>` naast een bestaande primitive (root-BACKLOG 2026-09-17).
ELEMENTS:    Input · Textarea · NativeSelect · Label · Button (ook `variant="link"`) · Separator ·
             Badge `size="sm"` in de telpillen van de tabbladen · weg: de constanten `INVOER`
             (ActiePanel) en `SELECT` (PlanFilters) en de inline klassenreeksen in FilterBar,
             ContactPanel, DashboardClient en SearchSettingsForm.
BEHAVIOUR:   Elk veld gedraagt zich als nu: zelfde naam voor een schermlezer, zelfde focusring,
             zelfde toetsenbordweg, zelfde waarde-afhandeling. De flow-harness drijft `select:visible`
             nog steeds aan (NativeSelect rendert een echte select). Geen enkel scherm verandert van
             maat: de metingen van fase 3 (kopstructuur, focus, namen, meta-rijen, overloop) blijven.
CONSTRAINTS: Alleen @umanex/ui en rol-utilities · geen nieuwe primitive in app-code · de panelen van
             /plan dragen compacte velden: een maat die de bibliotheek niet heeft, wordt een vraag en
             geen lokale override · cashflow en het dashboard blijven buiten deze fase (eigen commits,
             eigen scope) · geen gedragswijziging, dus geen nieuwe states.
```

---

## Open vragen

_(beantwoord 2026-09-17: Jeroen koos een maat-as van 36px in de bibliotheek — "47 velden uit de
bibliotheek, 0 maten in app-code")_

- ~~**Compacte velden.** De panelen van `/plan` en het opvolgingspaneel gebruiken kleinere velden dan
  de standaard van `Input`. Wordt dat een maat-as in `@umanex/ui` (zoals `Badge size="sm"` in 4a),
  of blijft die maat lokaal? Dit staat als root-BACKLOG-item *Compacte maat in @umanex/ui*
  (2026-09-07) en wordt hieronder eerst gemeten, dan gevraagd.~~

## Aannames

- [ASSUMPTION: de 96 `text-2xs`-overrides op Badge in cashflow (14) en het dashboard (2) horen bij hun
  eigen app-commit en niet bij deze fase; alleen de jobradar-plekken gaan nu om.]
- [ASSUMPTION: "geen gedragswijziging" is de harde eis, dus waar een primitive een andere maat of ring
  geeft, wint het bestaande beeld en wordt het verschil gemeld — niet stil geaccepteerd.]

## Acceptatie

**De bibliotheek (`@umanex/ui`)**
- [x] V1: `Input`, `NativeSelect` en `Textarea` hebben een `size`-as; `sm` rendert 36px, 36px en (bij twee regels) 54px — bewijs: eenmalige meting op de verse storybook-static (scratchpad `maten-meting.mjs`): Input 40 → 36px (`h-control-sm`), NativeSelect 40 → 36px, Textarea 80 → 54px bij twee regels (`min-h-0 py-item-y`, 6px)
- [x] V2: de standaardmaat is onveranderd: de geometrie-basislijn toont nul gewijzigde maten en nul gewijzigde klassen op de bestaande stories — bewijs: `geometry:write` gediffed tegen HEAD: 0 elementen met gewijzigde klassen en 0 met gewijzigde maten op de bestaande stories (47 stories, 254 elementen)
- [x] V3: `figma:check` was rood op de drie nieuwe assen vóór de Figma-stap en is groen erna — bewijs: vóór: `FAIL [variant] Input/NativeSelect/Textarea: code [disabled,size] vs Figma [disabled]` (rc=1); ná: `ok … disabled=2 × size=2 — gelijk` voor alle drie, 32 checks groen
- [x] V4: `parity` groen met de nieuwe varianten (Figma en browser gelijk op de gemeten maat) — bewijs: `parity` rc=0: 80 varianten gelijk op hoogte, padding, gap, radius, rand en opacity (74 vóór deze fase)

**jobradar**
- [x] V5: 46 van de 47 rauwe velden komen uit de bibliotheek; de ene uitzondering is het chipveld in `TermChips`, met reden — bewijs: `grep -rn "<input|<select|<textarea"` over app en components zonder api: 1 treffer (`TermChips.tsx:93`), was 47 — de uitzondering staat met reden in `apps/jobradar/BACKLOG.md`
- [x] V6: `Input`, `Textarea` en `NativeSelect` worden elk in minstens één app-bestand geïmporteerd — bewijs: `grep -rln`: Input in 7 bestanden, Textarea in 4, NativeSelect in 8
- [x] V7: de constanten `INVOER` (4 bestanden) en `SELECT` (1 bestand) bestaan niet meer — bewijs: `grep -rn "\bINVOER\b|\bSELECT\b"` in components: 0 treffers (was 4 bestanden met INVOER en 1 met SELECT)
- [x] V8: elk veld is nu 36px (selects en inputs) en twee-regelige textareas 54px — gemeten vóór (28–30px / 50px) en ná — bewijs: browsermeting vóór (scratchpad `veldhoogtes-voor.txt`: zoekveld 30px, statusfilter 29px, plan-velden 30px, textarea 50px) en ná (36px voor elk veld, textarea 54px); de 28px op /instellingen zijn de chipvelden die rauw bleven
- [x] V9: 22 Badge-overrides `className="text-2xs"` zijn `size="sm"`; nul `text-2xs` blijft op een Badge staan — bewijs: 22 Badges omgezet naar `size="sm"`; `grep` op een `text-2xs` binnen twee regels na `<Badge`: 0
- [x] V10: de jarenlijst van de planinstellingen komt uit het huidige jaar en bevat altijd het bewaarde jaar — bewijs: pure functie `jarenVoorStart` in `lib/plan/types.ts`, 6 checks in de plan-suite (441/441): venster schuift met de klok, en een bewaard jaar vóór of ná het venster staat erin. Tegenproef: venster op drie jaar → precies die 6 rood, daarna hersteld. In de browser gemeten: opties 2026–2029 met 2027 bewaard
- [x] V11: de volledige flow-harness is twee keer groen, inclusief de naam-as, de kopstructuur en de focus-pass — bewijs: `flow` rc=0 in drie runs (209 ✓), inclusief "namen: 114 / 25 / 44 elk met een naam", de kopstructuur-pass en de focus-pass
- [x] V12: `plan:probe` en `opvolging:probe` groen; de echte database blijft ongemoeid — bewijs: `plan:probe` rc=0 ("alle asserties geslaagd", inclusief 400 ≤ 400 op beide standen) en `opvolging:probe` rc=0; database-vingerafdruk vóór = na (bc7b0a3512424939)
- [x] V13: `flow --selftest` bewijst zijn zes assen ná de migratie — bewijs: `flow --selftest` rc=0: "alle 6 assen falen wanneer ze horen te falen"
- [x] V14: `tsc`, eslint, `ds:guard` en de tokens-guard groen — bewijs: `tsc` rc=0, `eslint` rc=0, `ds:guard` "9/9 apps", tokens-guard "403 bestanden schoon (1 baseline-uitzondering, bestaand)"

**Bewust niet gedaan (geteld, met reden)**
- [x] V15: de 21 rauwe knoppen blijven — `Button` begint bij 36px en deze knoppen zijn 24–28px (BACKLOG) — bewijs: geteld: 21 `<button>` in app-code, hoogtes 24–28px tegen `Button size="sm"` 36px; als BACKLOG-item vastgelegd met de meting erbij
- [x] V16: de 18 `border-t`-sectiegrenzen blijven — `Separator` is een los element met eigen marges (BACKLOG) — bewijs: geteld: 18 `border-t pt-*`-sectiegrenzen; als BACKLOG-item vastgelegd met de reden (Separator is een los element met eigen marges)

**States en interactie**
- [x] V17: States n.v.t. — dit is een vormwissel zonder nieuw gedrag; elk veld houdt zijn waarde, naam en toetsenbordweg — bewijs: geen nieuwe state gebouwd: de drie probes en de harness meten hetzelfde gedrag als vóór de fase, en `opvolging:probe` (17 gevallen) bleef groen
- [x] V18: de harness drijft `select:visible` nog steeds aan (NativeSelect rendert een echte `<select>`) — bewijs: `flow` interactie-sectie groen: "select gewijzigd" op `select:visible` — NativeSelect rendert een echte `<select>`

## Beslissingsgeschiedenis

- 2026-09-17: aangemaakt vanuit plan fase 4b, op "Doe 4b" van Jeroen.
