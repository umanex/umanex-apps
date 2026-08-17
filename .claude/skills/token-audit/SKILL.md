---
name: token-audit
description: Doorlicht bestaand design-werk op design-system-integriteit — token-bindingen, laag-correctheid en consistentie over herhaalde exemplaren, per property gemeten over een Figma-bestand, pagina of component-set, optioneel met de code-kant ernaast. Gebruik deze skill altijd wanneer de gebruiker een token-audit of parity-audit vraagt, wil weten of een bestand/component nog aan de tokens hangt, token-drift vermoedt, of zegt "audit de tokens", "check de token-bindingen", "doorlicht dit Figma-bestand", "klopt de parity nog", "is alles nog gebonden".
---

## Werkwijze

Dit is de derde audit-as, naast `ux-audit` (beleving) en `security-audit` (backend): **design-system-integriteit van bestaand werk**. De parity-gates in `code-naar-figma` (stap 8) en `figma-naar-code` (stap 6) meten op het schrijf-/bouwmoment; deze skill meet wat er daarna — door klonen, handwerk, gedeeltelijke exports en tijd — van geworden is. Elke instantie lokaal fixen zonder ooit te meten is precies hoe partner-portal aan 16 parity-nudge-commits in 90 dagen kwam.

**Primaire tool: Figma Console MCP** (Desktop Bridge). Native MCP is fallback-only en geeft enkel hex — daarmee is laag-correctheid principieel niet te meten. Start met `figma_get_status`; Bridge niet actief → vraag *"Wil je Desktop Bridge activeren, of overschakelen naar native MCP?"* en ga nooit stilzwijgend verder. De Bridge kan alleen schakelen naar bestanden waar de plugin al draait — vraag de gebruiker het doelbestand te openen als het er niet bij staat (`figma_list_open_files`).

**Deze audit is read-only.** Geen enkele stap schrijft in het designbestand. Elke fix — rebind, token-import, variable aanmaken — is een design-system-wijziging en dus een "altijd eerst bevestigen"-actie: rapporteer hem als voorstel met de exacte call, voer hem niet uit.

---

## Scope-gate — verplichte eerste stap

- **Wel:** een bestaand Figma-bestand, pagina, component(-set) of frame doorlichten; desgewenst de code-tegenhanger ernaast.
- **Niet:** een export die nú gebouwd wordt (dat is de parity-gate in `code-naar-figma` stap 8) · een component die nú vertaald wordt (dat is `figma-naar-code` stap 6-7) · visuele/UX-kwaliteit (`ux-audit`) · WCAG (`figma_lint_design` dekt dat al).

Bepaal met de gebruiker de doelset (heel bestand · pagina · node-subtree) vóór je meet — een bestandsbrede run op een groot bestand is traag en het antwoord is vaak per component gewenst.

---

## Stap 1 — Bronnen

1. `figma_get_status` (Bridge-gate hierboven).
2. **Token-bron** per klant-CLAUDE.md: `tokens.json` (vers gepulld) en/of de library. Dit is de bron-van-waarheid voor *wat er zou moeten bestaan* — stap 4 toetst het bestand ertegen.
3. Optioneel, voor de code-kant: `token-mapping.json` uit het actieve project (`figma-naar-code` stap 2) en het `## Verify-pad` van de app.

---

## Stap 2 — Foto van het token-gebruik

Eén enumeratie over de doelset: welke tokens zijn er werkelijk in gebruik, en uit welke lagen?

```javascript
await figma.loadAllPagesAsync()   // alleen bij bestandsbrede scope
const nm = async id => { try { const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : null } catch { return null } }
const namen = new Set()
const nodes = DOEL.findAll(n => n.boundVariables && Object.keys(n.boundVariables).length > 0)
for (const n of nodes) for (const k of Object.keys(n.boundVariables)) {
  const val = n.boundVariables[k]
  for (const a of Array.isArray(val) ? val : [val]) { const x = a && a.id ? await nm(a.id) : null; if (x) namen.add(x) }
}
```

`getVariableByIdAsync` resolvet óók library-variabelen — een lege `getLocalVariablesAsync()` betekent dus niet dat er niets gebonden is. Groepeer de namen per laag (stap 3-classifier) en leg de telling vast: dit is de nulmeting waar een volgende audit tegen difft.

---

## Stap 3 — Per-property enumeratie en classificatie

Loop de doelset per node af en lees wat er **staat** — niet wat er ooit geschreven is. Per node: `fills` · `strokes` (+ `strokeWeight`) · de vier radius-hoeken · de vier paddings · `itemSpacing` · `effects` · `opacity`; per TEXT-descendant ook `fontName`/`fontSize`/`textStyleId` + fill.

```javascript
const arr = v => Array.isArray(v) ? v : []   // fills is figma.mixed (symbol) bij afwijkende segmenten
```

**Classifier — en toets hem vóór je hem vertrouwt.** De laag volgt uit de tokennaam (klant-notatie uit de klant-CLAUDE.md; pas de prefixes aan):

```javascript
const laag = name => name.startsWith('components/') || /^[a-z]+\/(fill|outline|white|sizing)\//.test(name) ? 'component'
  : /^(spacing|radius|size|font)\//.test(name) || /^color\/(gray|neutral|blue|red|green|yellow|purple|orange)\//.test(name) ? 'primitief'
  : 'semantisch'
// inline tegenproef — draait mee in elke run; faalt hij, dan is elke uitkomst hieronder verdacht
const zelftest = [laag('components/button/radius') === 'component', laag('spacing/4') === 'primitief']
```

Elke property met een waarde valt in één van vier bakken:

| Bak | Betekenis | Ernst |
|---|---|---|
| **gebonden, juiste laag** | token gebonden op de hoogst passende laag voor deze rol | ok |
| **gebonden, verkeerde laag** | primitief waar semantisch/component bestaat, of een token uit een vreemde rol met toevallig dezelfde waarde (hex-collision) | P1 |
| **rauw** | waarde zonder binding terwijl er een token voor bestaat | P2 (P1 als de waarde bovendien afwijkt van elk token) |
| **token ontbreekt** | het bedoelde pad bestaat in de token-bron maar niet als Figma-variable — de binding *kon* nooit gelegd worden | P1, en de root cause is de export/import, niet de binder |

Die vierde bak is de les van Columba.Button (2026-08-17): vier properties leken "verkeerd gebonden" maar het bedoelde `components/button/spacing/*` bestond nergens als variable — de `button/`-laag was onvolledig geëxporteerd (14 kleur/sizing-tokens, nul spacing/radius). Zonder de token-bron ernaast (stap 1.2) is die bak onzichtbaar en lijkt de fix een rebind terwijl het een import is.

---

## Stap 4 — Partitie-invariant over herhaalde exemplaren

Bij N instanties van hetzelfde patroon (tabs, rijen, kaarten, chips) toets je nooit per exemplaar — een steekproef van drie op 25 is toevallig groen. Definieer de signatuur en assert dat élk exemplaar er exact één van de toegestane draagt:

```javascript
const sig = n => `${arr(n.fills).filter(f => f.visible !== false).length}f/${arr(n.strokes).length}s`
const items = DOEL.findAll(n => n.name === 'row')   // of 'tab', 'card', …
const buckets = {}
for (const it of items) (buckets[sig(it)] ||= []).push(it.id)
// verwacht: exact de toegestane sleutels, samen == items.length — een extra sleutel telt zichzelf
```

Gemeten voorbeeld (Partner Fleet Portal, 2026-08-17): 13 van 14 tabellen droegen exact `1f/0s + 1f/1s`; de veertiende had 0 van 4 rijen met een fill — transparant gerenderd, geen error, gevonden door de partitie en niet door kijken.

---

## Stap 5 — Code-kant (optioneel)

Alleen wanneer de gebruiker de code-tegenhanger wil meetoetsen én de app een render-pad heeft (`## Verify-pad`): render de component en diff **getallen tegen getallen** — `getComputedStyle` per property tegen `token-mapping.json` — nooit beeld tegen beeld; het oog haalt `pb-3` vs `pb-4` niet. Geen DOM (React Native)? Meld `[NIET GEMETEN — geen computed-style-pad]` en sla over; doe nooit alsof de visuele indruk deze as dekt.

---

## Stap 6 — Rapport

Per bevinding: **node-id + property + gebonden vs verwacht + bak + prioriteit**, met de meting erbij (nooit "lijkt af te wijken" — het getal of de tokennaam zelf).

- **P0** — zichtbaar kapot voor de kijker: onleesbaar, geclipt, transparant waar de partitie een fill eist.
- **P1** — breekt stil bij de volgende token- of themawijziging: verkeerde laag, hex-collision, afwijkende waarde, ontbrekend token in de variabelenset.
- **P2** — rauwe waarde met bestaand token; werkt vandaag, ontloopt elke centrale wijziging.
- **P3** — dekking en hygiëne (ongebruikte tokens, naamgeving). → dichtstbijzijnde `BACKLOG.md`, conform de globale regel.

Sluit af met: de nulmeting (stap 2-telling), de fix-voorstellen als exacte calls (import → rebind, in die volgorde waar bak 4 speelt) mét de herinnering dat uitvoeren een bevestigde design-system-wijziging is, en — bij een herhaalbare doelset — het commando/de node-ids waarmee de volgende run tegen deze uitkomst dift.

**Brug naar de eval-loop:** een bevinding die een terugkerende faalklasse blootlegt (zelfde bak, meerdere componenten of bestanden) is een `vastleggen`-trigger; losse instanties horen in het rapport, niet in LEARNINGS.

---

## Rails

1. **Read-only** — elke schrijfactie is een voorstel; uitvoeren pas na expliciet akkoord.
2. **Toets het instrument in elke run** — de classifier-zelftest draait inline mee; een audit waarvan de classifier faalt rapporteert niets behalve dat.
3. **`figma.mixed` is een symbol, geen array** — elke property-lezing loopt door de `arr`-guard, anders gooit de eerste tekst-node met gemengde fills de hele run om.
4. **Zonder token-bron geen bak 4** — meld dan expliciet dat "verkeerd gebonden" en "token bestaat niet" niet te onderscheiden zijn, en dat de fix-route dus onbekend is.
5. **Een audit zonder afgaan-kant bewijst niets** — bevat de doelset geen enkele bekende afwijking, toets de detectie dan op een synthetisch geval (zoals de zelftest) vóór je "schoon" rapporteert.
