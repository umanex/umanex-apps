# RowTrack — CLAUDE.md

## Project overzicht
React Native (Expo) rowing workout tracker app met BLE connectiviteit,
gamificatie en Supabase backend.

**Stack:** React Native · Expo SDK · Expo Router · TypeScript · Supabase  
**Figma bestand:** T1bGrvIzSNeLyh5CbarATZ  
**Design MCP:** Figma Console MCP (figma-console-mcp van southleft) via Desktop Bridge  

---

## Figma mapping

Voor elk Figma-gerelateerd werk: lees eerst `apps/rowtrack/figma-map.md`
om de juiste node-id te vinden. Niet gokken op basis van componentnaam.

---

## Design tokens

Tokens worden beheerd via Tokens Studio en gegenereerd via `pnpm tokens:build`.

- **Bron (niet handmatig bewerken):** `apps/rowtrack/tokens/tokens.json`
- **Build output (importeren in code):** `apps/rowtrack/constants/`

Gebruik altijd imports uit `@/constants` — geen hardcoded kleuren, spacing, radii of font families.
Voor de beschikbare exports (kleuren, `fontFamily`, `typeStyles`, `space`, `radii`): lees
`constants/index.ts` en de bestanden waar hij naar herexporteert. Niet hier dupliceren — dat drift.

---

## Conventies

### Code
- `StyleSheet.create()` — nooit inline styles
- `TouchableOpacity` voor interactieve elementen, `activeOpacity={0.8}`
- Iconen via `@expo/vector-icons` (Ionicons) — **nooit** `lucide-react-native`
- Import alias: `@/components/...`, `@/lib/...`
- 1 component = 1 bestand, PascalCase bestandsnaam

### Figma workflow
- **Nooit** native Figma Code Connect
- **Altijd** Figma Console MCP (`figma_execute`) voor schrijfoperaties
- **Altijd** `get_metadata` + `get_screenshot` voor lezen
- Figma bestand: `T1bGrvIzSNeLyh5CbarATZ`
- Components pagina: `node-id=21-378`
- Screens pagina: `node-id=0-1`

### BLE
- Rower: FTMS service `00001826`, characteristic `00002ad1`
- HR: Heart Rate service `0x180D`, characteristic `0x2A37`
- Twee notification types: distance/elapsed packet en spm/watts/split packet

### Supabase
- Tabellen: `profiles`, `workouts`, `period_goals`
- Lees het schema live via de `supabase-rowtrack` MCP-server (`list_tables`) — kolomnamen niet
  hier dupliceren, die drift (een gekopieerd schema stond hier maanden verkeerd)
- Let op de servernaam: `supabase-cashflow` wijst naar een ánder project

---

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-07 door het te draaien, niet door
het af te leiden. Staat er "geen", dan is dat een gat dat gebouwd moet worden — geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `xcrun simctl io booted screenshot <pad>.png` — werkt. Nooit een UDID hardcoden, die verandert; `booted` is stabiel. Op het fysieke toestel: geen automatisch pad, screenshot met de hand. |
| **Flow aandrijven** | **Geen.** Geen idb, geen Detox, geen Maestro. Tappen, typen en navigeren gebeuren door Jeroen. Elk acceptatie-item dat door de UI loopt is dus `[NIET TE VERIFIËREN]` tenzij hij meekijkt. |
| **State forceren** | `app/dev-active.tsx` forceert de active-workout fase. Voor de rest: **geen** — en er is **geen testaccount**, er is één profiel en dat is Jeroens echte. |
| **Invariant draaien** | `node --test <bestand>.test.ts` — Node 24 draait TypeScript zonder transpiler en heeft `node:test`/`node:assert` ingebouwd, dus dit kost geen dependency. Werkt op modules zonder path-alias of RN-import (`lib/bestDistanceTime.ts`, `calories.ts`, `smoothing.ts`, `period.ts`). Een module die `@/…` importeert lost Node niet op. |
| **Verse build** | De app op de simulator is een **dev-client**: zonder Metro (`pnpm dev:rowtrack`) draait hij op wat er toevallig nog in het geheugen zit. Controleer de datum van `~/Library/Developer/CoreSimulator/Devices/<udid>/data/Containers/Bundle/Application/*/RowTrack.app/` vóór je een screenshot als bewijs gebruikt — op 2026-08-07 was die een maand oud en dat is aan de render niet te zien. Na een native wijziging: `expo run:ios --device`, cf. de worklets-les. |

**Destructieve paden — niet aanroepen.** `revoke_health_consent()` wist hartslag uit alle ritten en
leegt de lichaamsvelden, en er is geen testaccount om dat op te vangen. Toets de guard (aanroepen
zonder auth, daarna tellen dat de data er nog staat) of draai de transformatie op synthetische
`jsonb` in een `select`. Zie rail 5 in de `verify`-skill.

**Migratiestaat: toets het schema, niet het ledger.** Migraties worden hier met de hand in de SQL
Editor gedraaid, dus `list_migrations` kent er 6 van de 11 in `supabase/migrations/`. Alle elf zijn
toegepast — het ledger is stil onvolledig, niet het schema. Een briefing die schrijft "de migratie is
nog niet gedraaid" veroudert daardoor zonder dat iemand het merkt; schrijf de *check* op in plaats
van de *staat*, en toets tegen `information_schema` of `pg_indexes`. Let op: een unique constraint
kan hier een unique *index* zijn — `pg_constraint` alleen bekijken geeft een vals negatief.

---

## Veelgemaakte fouten

| Probleem | Oplossing |
|---|---|
| `topSvgLayout` crash | Gebruik `@expo/vector-icons`, niet `lucide-react-native` |
| BLE PLX old-arch interop | `react-native-ble-plx` uses `RCT_EXPORT_MODULE()`; RN 0.81 interop layer handles this automatically |
| Modal niet fullscreen | Gebruik `<Modal transparent statusBarTranslucent>`, niet `absoluteFillObject` |
| Fonts niet geladen in Figma | `await figma.loadFontAsync(...)` vóór elke `createText()` |
| Tab label verkeerd | Tab heet "Training" (niet "Workout") |
| pod install faalt | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
