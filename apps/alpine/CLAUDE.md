# alpine — projectcontext

Conceptueel design voor een eigenaarscommunity rond de **Alpine A110**, wereldwijd. Twee
platformen: een mobiele app (React Native / Expo) en een desktop webportal.

Dit bestand is bewust **minimaal**: het bevat alleen wat vaststaat. Vul aan naarmate het
concept hardt — verzonnen projectcontext is schadelijker dan geen.

## Wat vaststaat

- **Er staat vandaag geen code in deze map, en dat is een keuze.** De opdracht van 2026-09-11
  zegt expliciet: geen code, geen eigen repo. De map bestaat om de briefing en de projectcontext
  een huis te geven; `package.json`, `tsconfig` en componenten komen pas wanneer het concept
  gevalideerd is.
- **De deliverable leeft in Figma**, bestand `P552u2mCWH04IEMgnkUGyN` ("Alpine"),
  [figma.com/design/P552u2mCWH04IEMgnkUGyN/Alpine](https://www.figma.com/design/P552u2mCWH04IEMgnkUGyN/Alpine?node-id=0-1).
  Paginastructuur: `00 — Foundations` · `01 — Components` · `02 — Mobile` · `03 — Desktop` ·
  `04 — Explorations`.
- **Eigen merk, los van umanex.** Geen umanex-tokens, geen `@umanex/config`-preset, geen
  `@umanex/ui`. Dit is de tweede staande uitzondering naast rowtrack (zie
  `.umanex-os/profiles/umanex.md` → Centrale design source).
- **De Figma-variables zijn de latere bron voor een eigen `tokens.json`** via Tokens Studio.
  Daarom nu al: `Core/*`-primitieven gescheiden van een semantische laag die ernaar aliast,
  kleur als hex, neutrale schaal 50–950, licht en donker als modes binnen één collectie,
  namen in kebab-case. Schermen en componenten binden **uitsluitend** aan de semantische laag.
- **De tijdlijn is de ruggengraat.** Elke feature voedt dezelfde chronologie; niets staat als
  losse module naast de tijdlijn. Toon: autodossier en servicelogboek, niet dashboard.
- **Chassisnummers worden in de UI nooit volledig getoond** — gemaskeerd, alleen de laatste
  cijfers. Dit is een harde constraint, geen stijlkeuze.
- Werk in de hoofdtree, `apps/alpine`, op een feature branch vanaf `origin/main`.

## Wat nog open staat

- De vier open vragen uit `briefings/2026-09-11-feature-alpine-community-platform.tcebc.md`:
  typologie van het snel-invoerscherm · welke states afvallen · statische frames of ook
  hover/pressed-varianten · de eigen merknaam die straks de tokens.json-prefix wordt.
- Of het concept een code-vervolg krijgt, en zo ja op welk platform eerst.

## Design-systeem-bron

- **Preset:** geen — eigen merk, geen `@umanex/config/tailwind/preset`. Er is geen Tailwind-laag
  omdat er geen code is; de bron is de Figma-variable-collectie in bestand `P552u2mCWH04IEMgnkUGyN`.
- **Componentbron:** geen — niet `@umanex/ui`. De componenten leven als Figma-componenten op
  pagina `01 — Components`.
- **Storybook:** geen — geen code, dus geen stories. Koppelen aan de Storybook van `@umanex/ui`
  is hier niet aan de orde: die draagt de umanex-rollaag, dit merk staat er los van.

---

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. De meetbare as loopt volledig via de **Figma Desktop
Bridge** (Figma Console MCP), nooit via REST — een REST-render is na een edit per definitie stale.

| Capability | Commando / status |
|---|---|
| **Bridge leeft** | `figma_get_status` met `probe: true`; verwacht `probeResult.success === true` én `connectedFile.fileKey === 'P552u2mCWH04IEMgnkUGyN'`. Draait de server op de fallback-poort (9225 i.p.v. 9223), dan is dat normaal — er staan oudere instanties op 9223/9224. |
| **Render vastleggen** | `figma_capture_screenshot` met expliciete `nodeId` — runtime-klasse, dus vers. Zonder `nodeId` krijg je de hele pagina. |
| **Token-binding meten** | `figma_execute`: loop over `findAll()` en tel nodes met een lege `boundVariables` per property (`fills`, `strokes`, `fontSize`, `itemSpacing`, `paddingLeft`, `cornerRadius`). **Rapporteer altijd mét noemer** — `0 van 333`, nooit kaal `0`. |
| **Laag-correctheid meten** | `figma_execute`: vergelijk elke `boundVariables`-variable-id tegen `variableCollectionId` van de `Core`-collectie. Elke treffer op een node onder `01/02/03` is een bevinding: een scherm hoort nooit rechtstreeks aan een primitief te hangen. |
| **Hergebruik meten** | `figma_execute`: `findAll(n => n.type === 'INSTANCE')` en vergelijk `(await n.getMainComponentAsync()).parent.id` met de id van de timeline-item component set. Een nagebouwd item is een `FRAME` dat erop lijkt — dat is precies wat deze telling vindt. |
| **Auto-layout meten** | `figma_execute`: tel `layoutMode === 'NONE'` over alle FRAME- en COMPONENT-nodes. Mét noemer. |
| **Copy-regels meten** | `figma_execute`: regex over alle TEXT-nodes. Persoonlijke voornaamwoorden (`je`, `jij`, `jouw`, `u`, `uw`, `ik`, `mijn`, `we`, `wij`, `ons`, `onze`), lorem ipsum, en een 17-teken VIN-vorm voor het chassisnummer. Mét noemer. |
| **Invariant draaien** | **Geen, en niet nodig.** Geen afgeleide berekening in dit concept. |
| **Flow aandrijven** | **Geen.** Statische Figma-frames, geen prototype-links en geen runtime. Niet van toepassing in plaats van onbereikbaar — dat verschil telt. |
| **State forceren** | **Geen runtime**, dus states zijn aparte frames in plaats van forceerbare toestanden. Een state die niet als frame bestaat, bestaat niet. |
| **Verse build** | **Geen.** Geen code, geen build. |
