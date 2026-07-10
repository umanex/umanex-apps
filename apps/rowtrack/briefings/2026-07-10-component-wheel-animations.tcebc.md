# TC-EBC — WheelPicker & GoalSegments animatie-polish

| Veld | Waarde |
|------|--------|
| Datum | 2026-07-10 |
| Type | component |
| Project | rowtrack |
| Klant | umanex (eigen product) |
| Status | gevalideerd |

Polish-vervolg op de wheel-redesign + finetune.

---

```
TASK:        Animaties naar high-end/polished tillen: (1) wheel-scroll + waarde-wissel vloeiender, (2) de tab-wissel in goal-segments vloeiend animeren (nu instant sinds LayoutAnimation eruit is), zonder de Fabric stale-width bug terug te brengen.
CONTEXT:     IdlePhase — WheelPicker + GoalSegments.
ELEMENTS:    WheelPicker scroll/settle/cross-fade; GoalSegments actieve-pill + label transitie.
BEHAVIOUR:   Wheel scrollt/snapt vloeiend; chip-tik animeert soepel; tab-wissel laat de actieve pill (bg + border + label) vloeiend "pop-in" i.p.v. hard verschijnen.
CONSTRAINTS: RN+Expo, Fabric-renderer. GEEN LayoutAnimation (gaf stale-width bug) en GEEN Reanimated (niet geïnstalleerd → dep + native rebuild). Enkel RN Animated met native-driver (opacity/transform). Tokens. Geen regressie op stale-width / unit-alignment.
```

---

## Open vragen

- Reanimated-beslissing bij Jeroen: buttery-smooth segment-layout-transities (schuivende/verbredende pill) en spring-wheel vereisen `react-native-reanimated` + native dev-client rebuild. Zonder dat: native-driver pop-in (geen layout-animatie).

## Aannames

- [ASSUMPTION] De actieve pill "pop-in" (opacity + scale via native driver) maskeert de instant breedte-snap voldoende voor een gepolijst gevoel; volledige layout-transitie vergt Reanimated.
- [ASSUMPTION] Een deel van de waargenomen jank is de simulator/debug-build; op een echt toestel/release rendert native-driver vloeiend.

## Acceptatie

- [x] Wheel-scroll/cross-fade volledig op de UI-thread (Reanimated `useAnimatedScrollHandler` + `useAnimatedStyle`) → buttery. Live bevestigd door Jeroen ("wheel is nu perfect").
- [x] Tab-wissel: actieve pill + label poppen in met een UI-thread spring (Reanimated custom `entering`: opacity + scale 0.9→1 met back-easing).
- [x] Geen regressie: segmenten correct verdeeld via de remount (Fabric reclaimt de label-breedte); unit-alignment intact.
- [x] Typecheck groen; native rebuild (RNReanimated 4.1.7 + RNWorklets) 0 errors; app rendert + Reanimated draait.

**Bewuste beperking (Figma-getrouw gekozen door Jeroen):** de segment-**breedte** morpht niet vloeiend — zowel RN `LayoutAnimation` als Reanimated `LinearTransition` brengen de Fabric stale-width clipping terug. Enkel de remount ruimt die betrouwbaar op, en remount sluit een layout-animatie uit. Dus: breedte snapt (correct), verschijning is buttery. Het alternatief (gelijk-brede segmenten + schuivende pill, volledig vloeiend) is afgewezen omdat het afwijkt van de variabele-breedte Figma-look.

## Beslissingsgeschiedenis

- 2026-07-10: Reanimated niet beschikbaar → eerst native-driver pop-in. Jeroen koos de **Reanimated-route**: reanimated ~4.1.1 + worklets 0.5.1 geïnstalleerd, `babel.config.js` met worklets-plugin, native dev-client rebuild.
- 2026-07-10: WheelPicker herschreven met Reanimated (UI-thread cross-fade) → buttery, goedgekeurd. GoalSegments eerst met `LinearTransition` → herintroduceerde de stale-width clipping → teruggedraaid naar remount + Reanimated `entering` pop-in. Figma-getrouwe variabele-breedte behouden; breedte-snap bewust geaccepteerd.
