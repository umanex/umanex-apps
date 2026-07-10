# TC-EBC — WheelPicker redesign (pill + 5 rijen + opacity-fade)

| Veld | Waarde |
|------|--------|
| Datum | 2026-07-09 |
| Type | component |
| Project | rowtrack |
| Klant | umanex (eigen product) |
| Status | gevalideerd |

Figma: [IdlePhase/Wheel](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=36-1956). Vervolg op de v2 IdlePhase-iteratie. Meegenomen bugfix (TC-EBC-exempt): tab-clipping in GoalSegments.

---

```
TASK:        WheelPicker herstylen naar het nieuwe design: 5 zichtbare rijen i.p.v. 3, de geselecteerde rij in een gevulde afgeronde pill i.p.v. de hairline top/bottom-indicator, en een progressieve opacity-fade (0.5 / 0.75 / 1 / 0.75 / 0.5) naar de randen. Fade + grootte volgen de scroll in real-time.
CONTEXT:     Waarde-selector in de DOEL-sectie van IdlePhase (duration/distance/split/watts). Enige selector sinds de nudge-removal. Bestaand component — visuele herstyle, geen nieuw gedrag.
ELEMENTS:    WheelPicker (350×220): centrale pill (bg.raised, radius md=16, ~60h, full-width, achter de tekst); 5 waarde-rijen (ITEM_H 44); geselecteerde waarde serif 34 + unit italic 16 (fg.primary); niet-geselecteerd serif 16 + unit italic 16 (fg.secondary); opacity per afstand tot center.
BEHAVIOUR:   Verticale scroll snapt per rij (behoud snapToInterval + selection-haptics + parent-sync). De rij onder de pill is groot + volle opacity; buurrijen (±1) opacity 0.75; buitenrijen (±2) 0.5. Opacity én grootte interpoleren real-time op de scroll-offset (native driver), niet enkel op settle.
CONSTRAINTS: React Native + Expo. RowTrack-tokens via @/constants (bg.raised, radii.md, fg.primary/secondary, fontSize 34/16); geen nieuwe hardcodes. useNativeDriver voor opacity/scale (performance bij lijsten tot 180 items). Behoud de WheelPicker-props-API (items/selectedIndex/onIndexChange) — geen wijziging aan IdlePhase-call.
```

---

## Open vragen

- Geen blokkerende. Grootte-transitie via `scale`-transform (native driver) i.p.v. animeerbare fontSize; waarde-basis op 34px en downscalen naar ~0.47 voor niet-center (downsampling = scherper dan upscalen).

## Aannames

- [ASSUMPTION] ITEM_H = 44 → 5×44 = 220 = Figma-containerhoogte; pill 60h gecentreerd (overlapt buurrijen licht, conform Figma waar de selected-rij 60 vs 40 is).
- [ASSUMPTION] Opacity-trap: dist0=1, dist1=0.75, dist≥2=0.5. Enkel de waarde schaalt (16↔34); de unit blijft 16 in beide staten.
- [ASSUMPTION] Real-time interpolatie is gewenst (de gevulde pill maakt een settle-based "grote tekst blijft hangen" zichtbaar lelijk).

## Acceptatie

- [x] 5 zichtbare rijen; geselecteerde rij in een gevulde pill (bg.raised, radius md) i.p.v. hairline-lijnen. → live geverifieerd (split-wheel 1:58/1:59/2:00/2:01/2:02).
- [x] Opacity 0.5/0.75/1/0.75/0.5 naar de randen; waarde 34 (center) / 16 (rest); unit italic 16 altijd. → live geverifieerd.
- [x] Fade + grootte volgen de scroll real-time (native driver), niet enkel op settle. → Animated.event(useNativeDriver) + per-rij interpolatie.
- [x] Snap, haptics en parent-sync ongewijzigd; props-API intact. → onScroll-listener haptics + onMomentumScrollEnd-commit behouden; profile-datepicker erft de look zonder breuk.
- [x] Alle waarden via tokens; typecheck groen; live parity op simulator. → tsc exit 0; split-variant matcht Figma 36:1956.
- [x] **Bugfix** GoalSegments tab-clipping opgelost → alle 5 segmenten volledig zichtbaar met Split actief (useWindowDimensions-breedte).

## Bugfix (meegenomen, TC-EBC-exempt)

- **GoalSegments tab-clipping** — root cause: full-bleed band (`marginHorizontal: -screenHorizontal`) heeft geen definitieve breedte, dus de `flex:1` inactieve segmenten comprimeren niet en de rij loopt buiten beeld wanneer een later segment (Split/Watt) actief is. Fix: definitieve band-breedte via `useWindowDimensions().width`. Figma-referentie (Active=Watt, node 72:15146): inactief grow:1 @72, actief hug @95, totaal ≈391 past in 390.

## Beslissingsgeschiedenis

- 2026-07-09: TC-EBC opgesteld op basis van Figma-node 36:1956. Wheel van 3→5 rijen, hairline→gevulde pill, opacity-fade real-time. Tab-clipping bugfix meegenomen (width-constraint root cause).
