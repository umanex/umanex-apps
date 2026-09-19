# Design-system-dekking — de vijfde lens

Hoort bij framework 5 en Procedure-stap 4b van `ux-audit`. Lees dit vóór je de lens draait;
de conditie waaronder hij überhaupt draait staat in `SKILL.md`, niet hier.

## Waarom deze lens bestaat

De vier lenzen in `SKILL.md` meten wat er **staat**. Geen ervan ziet wat er **ontbreekt**. Een
scherm kan vol scoren op een systeem zonder dark-mode-palet, zonder motion-waarden en zonder één
regel documentatie — het scherm gebruikt die dingen niet, dus niets kan rood worden. Die blinde
vlek is per constructie: een scherm-audit raakt alleen de onderdelen die het scherm aanraakt, en
daardoor kan een systeem jaren onvolledig blijven zonder dat één audit het meldt.

## De bron

**[Design System Checklist](https://www.designsystemchecklist.com)** — open source. Gemeten
2026-09-15: **Design language 10 · Foundations 26 · Core components 166 · Maintenance 28** =
230 items.

Kopieer die lijst niet naar binnen. Hij is van iemand anders en hij verandert; een kopie hier
veroudert stil en wordt dan een tweede bron van waarheid — dezelfde fout als een Figma-variabele
zonder token. Loop hem door op de site en noteer per subcategorie `n/N gedekt`, elk met `bewijs:`
(tokenpath, componentpad, node-id of doc-URL), zelfde regime als elke andere bevinding.

## De twee categorieën die bij een klant-design-system het meeste opleveren

**Foundations** — Color 4 · Layout 4 · Typography 5 · Elevation 3 · Motion 3 · Iconography 7.
Dit is de laag van `tokens.json`. Grens met `token-audit`: die meet of wat er **ís** correct
gebonden is en niet gedrift; deze lens meet of het er **is**. Een ontbrekende as — geen
motion-waarden, geen z-index-systeem, geen dark-mode-palet — is een bevinding hier, geen drift
daar.

**Maintenance** — Documentation 10 · Local libraries 4 · Team processes 6 · Community support 4 ·
Contribution 4. Proces, niet product. In een eenmanspraktijk vallen Community support en
Contribution grotendeels weg: schrijf `n.v.t. — <reden>` in plaats van een laag cijfer, zelfde
regime als `n.v.t.` in de Scoring.

De twee andere categorieën (Design language 10, Core components 166) loop je door wanneer het
auditobject het design system zélf is. Core components is met 166 items de grootste en de meest
mechanische: hij toetst per component of states, varianten, responsiveness en a11y-gedrag gedekt
zijn, en overlapt daar deels met `figma_audit_component_accessibility`. Noteer die overlap in
plaats van beide te tellen.

## Drie grenzen

**Geen score-input.** Het totaal blijft 17 items op max 85. De dekking is een aparte telling met
een eigen noemer, precies zoals de `impeccable`-scores: schrijf `DS-dekking 34/230` **náást**
`52/85`, nooit erin. Een dekkingspercentage dat in de UX-score verdwijnt maakt de bestaande
rapporten onvergelijkbaar en verbergt zichzelf.

**Contrast komt hier niet binnen.** Dat meten de detector-uitslag, `figma_lint_design` en het
Accessible-ijkpunt al, op het scherm. Wat deze lens erover toevoegt zit één laag hoger: bestaat
er een **regel** over toegankelijke paren in het palet, en is die gedocumenteerd — niet of dít
paar faalt. Dubbel meten levert twee bevindingen voor één gat.

**Bevindingen zijn gewone bevindingen.** `F<n>` met `bewijs:`, `impact:`, `effort:`,
`aanbeveling:`, en een rij in sectie 12. Een ontbrekend systeemonderdeel is bijna nooit P0 of P1:
het blokkeert vandaag geen gebruiker. Zelfde redenering als *een content- of positioneringsgat is
nooit P0* in `SKILL.md`.
