# Verify-pad — Figma-prototype (klikdummy)

Het uitvoerbare pad voor de as **Prototype / klikbaar design** uit `verify`. Het drijft de **échte prototype-player** aan in de browser en leest af of een klik navigeert — geen node-properties, geen vorm-check.

Waarom dit bestaat: een reaction kan correct gevormd zijn (`ON_CLICK` · `NAVIGATE` · geldige bestemming) en tóch nergens toe leiden, omdat de dragende node geen trefvlak heeft. Die vier asserties staan even groen op de kapotte als op de werkende staat — zie `CLAUDE.md`, *"Een groene check vraagt een negatieve controle"*.

## Capabilities

| Capability | Hoe |
|---|---|
| **Render vastleggen** | `computer{action:"screenshot"}` op de player-tab |
| **Flow aandrijven** | `computer{action:"left_click"}` op een uit Figma berekend punt |
| **State forceren** | startscherm kiezen via `node-id` in de proto-URL |
| **Invariant draaien** | geen |
| **Verse build** | n.v.t. — de player toont de laatst opgeslagen staat van het bestand |

## Stap 1 — Geometrie ophalen (Bridge, read-only)

Levert de relatieve positie van de hotspot binnen zijn scherm-frame. Bestandsguard verplicht (rail 6).

```js
const KEY = '<fileKey>';
if (figma.fileKey !== KEY) return { meting_ongeldig: `bestandsguard: ${figma.fileKey}` };
await figma.loadAllPagesAsync();
const node = await figma.getNodeByIdAsync('<hotspot-id>');
if (!node) return { meting_ongeldig: 'hotspot-node niet gevonden' };

// Het scherm is de bovenste frame-node vóór een PAGE of SECTION — structureel, niet op naam.
// De top-level node zelf deugt niet: dat kan een SECTION zijn die alle schermen bevat.
let screen = node;
while (screen.parent && screen.parent.type !== 'PAGE' && screen.parent.type !== 'SECTION') screen = screen.parent;
if (!screen.absoluteBoundingBox) return { meting_ongeldig: `geen scherm-voorouder voor ${node.id}` };

const b = node.absoluteBoundingBox, s = screen.absoluteBoundingBox;
if (!b || !s) return { meting_ongeldig: 'geen absoluteBoundingBox (onzichtbare node?)' };
const dest = node.reactions.flatMap(r => r.actions || (r.action ? [r.action] : []))
                          .find(a => a.type === 'NODE');
return {
  startframe: { id: screen.id, naam: screen.name, w: s.width, h: s.height },
  rel: { x: (b.x + b.width/2 - s.x) / s.width, y: (b.y + b.height/2 - s.y) / s.height },
  verwachte_bestemming: dest ? dest.destinationId : null
};
```

Geen `NODE`-actie gevonden → er valt niets te verifiëren; meld dat als bevinding, niet als geslaagde meting.

De scherm-regel is structureel omdat een laagnaam een bewering is, geen eigenschap (`CLAUDE.md`, *"Een naam is een bewering over het ding"*). Gemeten op LQB over vier hotspots: hij levert `unit:02-company-vat — B` (1366×1024) voor de desktop-gevallen en `mobile:02-company-vat — B` (390×852) voor de mobiele — één regel, beide schermformaten, geen naamconventie nodig.

## Stap 2 — Player openen

```
https://www.figma.com/proto/<fileKey>/<naam>?node-id=<startframe-id met - i.p.v. :>&scaling=contain&hide-ui=1
```

`scaling=contain` maakt de schaal voorspelbaar; `hide-ui=1` haalt de player-chrome weg zodat het frame de canvas vult.

## Stap 3 — Klikpunt berekenen

Twee schaalslagen, allebei nodig. `contain` centreert het frame in de canvas, en de `computer`-tool werkt in **screenshot-ruimte**, niet in viewport-ruimte.

```js
const c = document.querySelector('canvas'), r = c.getBoundingClientRect();
const FW = <frame-w>, FH = <frame-h>, relX = <rel.x>, relY = <rel.y>;
const scale = Math.min(r.width / FW, r.height / FH);
const rw = FW * scale, rh = FH * scale;
const ox = r.left + (r.width - rw) / 2, oy = r.top + (r.height - rh) / 2;
({ viewportPunt: { x: ox + relX * rw, y: oy + relY * rh }, vw: innerWidth, vh: innerHeight })
```

Klikcoördinaat = `viewportPunt × (screenshotBreedte / innerWidth)`. Die factor lees je af uit de screenshot-header (bv. 1456 bij `innerWidth` 1728 → 0,8426). Controleer het punt visueel op de screenshot vóór je klikt — anders meet je je eigen rekenfout.

## Stap 4 — Gereedheidspoort, dan klikken

**De player rendert niet in een verborgen tab.** Gemeten op LQB (2026-08-18): `document.visibilityState === 'hidden'`, **0 `requestAnimationFrame`-frames in 500 ms**, en kliks worden geslikt. `document.hasFocus()` stond daarbij op `true` — een focus-check liegt hier dus. Een rAF-teller zonder timer-fallback hángt bovendien: hij lost nooit op en je tool-call verloopt na 45 s.

Het praktische gevolg:

1. Na `navigate`: screenshot. Is die **blanco**, dan is de player nog niet klaar — dat is géén gereedheid. Wacht en herhaal tot je het verwachte startscherm ziet.
2. **Eén screenshot direct vóór élke klik.** De screenshot forceert een frame in de verborgen tab; die dient voor precies één klik. Gemeten: 3/3 navigaties mét dit frame, 0/1 zonder.
3. Dan pas `left_click`.

## Stap 5 — Aflezen en interpreteren

```js
new URL(location.href).searchParams.get('node-id')   // bv. "604-42883"
```

De player schrijft het actieve scherm in de URL. Verandert hij naar de verwachte bestemming → de hotspot werkt.

**Interpretatiepoort — verplicht.** Blijft de `node-id` staan, concludeer dan *niet* meteen "hotspot dood". Stilte en een geparkeerde tab zien er identiek uit. Vuur in **dezelfde page-load** een bekend-werkende hotspot af:

- die navigeert → de stilte was echt → de hotspot is dood (bevinding)
- die navigeert óók niet → `{ meting_ongeldig: 'player reageerde niet in deze page-load' }` — geen bevinding, een kapotte meting

Zonder die tegenproef rapporteer je de tab-staat in plaats van het prototype.

## Ijking van het instrument zelf

Gemeten op LQB (`I10uhQ56vYr3sQ3mrl2csB`, 2026-08-18), beide kanten:

| geval | verwacht | gemeten |
|---|---|---|
| werkende link `604:43108`, mét gereedheids-frame | navigeert | `604-43079` → `604-42883` (3/3) |
| zelfde klik, zonder gereedheids-frame | — | geen navigatie: **vals-negatief** |
| klik op een plek zonder hotspot | stil | `604-43079` ongewijzigd |
| werkende link direct erna, zelfde page-load | navigeert | navigeert → de stilte was echt |

## Grenzen

- **Eén klik per screenshot.** Een reeks kliks achter elkaar zonder tussentijdse screenshot valt terug in de verborgen-tab-modus.
- **Alleen `NAVIGATE`.** Overlays, smart animate, scroll-to en `ON_DRAG` zijn niet in de URL af te lezen; daarvoor is de screenshot je enige as.
- **Geen schrijfoperaties.** Dit pad is read-only op het klantbestand — het opent de player, het raakt het document niet aan.
- **Per-bestand specifics** (fileKey, startframes, bekend-werkende ijk-hotspot) horen in de `CLAUDE.md` van de klant-repo waar dat prototype leeft, niet hier.
