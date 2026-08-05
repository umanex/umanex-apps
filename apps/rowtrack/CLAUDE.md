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
- Lees het schema live via de Supabase MCP (`list_tables`) — kolomnamen niet hier
  dupliceren, die drift (een gekopieerd schema stond hier maanden verkeerd)

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
