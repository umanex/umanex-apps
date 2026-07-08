# TC-EBC — Button-primitive uitlijnen op Figma (audit cluster 4)

- **Datum:** 2026-07-08
- **Type:** component
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gebouwd + code-geverifieerd (visuele bevestiging in-app open)

---

```
TASK:        Button-primitive uitlijnen op het Figma-design: echte trailing-pijl
             i.p.v. tekstglyph, en de Stop-knop volgens de gekozen variant.
CONTEXT:     Audit cluster 4. components/Button.tsx is de gedeelde CTA-primitive.
             Nu: icon rendert LINKS (size 24, ongebruikt); pijlen zitten als
             unicode-glyph '→' in de titel ("Start →", "Opslaan →"); Stop-knop is
             variant="destructive" (subtiele tint) waar het design Primary (rode
             gradient) toont; primary mist de 1px accent-rand + 4-laags schaduw die
             sinds cluster 1 wél als token bestaan (buttonTokens.primary.shadow).
ELEMENTS:    Button.tsx (variants primary/destructive/ghost/outline · sizes md/lg ·
             loading · disabled). Trailing-pijl = Ionicons 'arrow-forward'. Usages:
             IdlePhase "Start training", ActivePhase 2× "Stop training" (portrait
             r565 + landscape r617) + "Opslaan →" r717, Home "Start →".
BEHAVIOUR:   Pijl verschijnt RECHTS van het label op CTA's (gap ~10); loading
             vervangt content door spinner (bestaand); press = TouchableOpacity
             activeOpacity 0.8 (ongewijzigd).
CONSTRAINTS: RN/Expo · @expo/vector-icons (Ionicons, nooit lucide) · StyleSheet.create ·
             uitsluitend tokens uit @/constants, geen hardcoded · kleuren buiten scope
             (Verbreek/connected-kleur = cluster 7).
```

---

## Beslissingen (2026-07-08, door Jeroen)

1. **Trailing-icon API** → `iconPosition?: 'leading' | 'trailing'` (default 'leading').
2. **Stop-knop variant** → Primary (design wint).
3. **Primary rand + schaduw** → 1px accent-rand + 4-laags `buttonTokens.primary.shadow` (boxShadow).

## Aannames

- `[ASSUMPTION]` Trailing-pijl = Ionicons `arrow-forward` (size 18); glyph-'→' vervangen door icon-prop.
- `[ASSUMPTION]` Trailing-pijl toegepast op CTA's met pijl in design: Start training, Stop training
  (2×), Home Start, Opslaan — niet op secundaire knoppen.

## Openstaand

- **Token-correcties A+B: OPGELOST** (Jeroen, Tokens Studio, commits `6d5cb07` + `2e502e0`).
  `button.primary.borderWidth` → `{borderWidth.1}` (1px rand rendert nu); `spacing.44`
  toegevoegd + `button.primary.height` → `{sizing.44}` (44). Code bedraad: `space['44']`
  voor `sizeLg`-hoogte, `buttonTokens.primary.borderWidth` voor de rand.
- **Visuele verificatie:** geen render-pad in deze omgeving → boxShadow-render (iOS/Android,
  inset-lagen) + Stop-als-Primary nog niet met eigen ogen bevestigd. Beoordeel-as visueel =
  overgeslagen; aanbevolen dat Jeroen dit in de app eyeballt.

## Acceptatie

- [x] Button ondersteunt trailing icon zonder bestaande usages te breken (`tsc` groen).
- [x] Glyph-'→' uit CTA-titels vervangen door echt vector-icoon rechts.
- [x] Stop-knop (portrait + landscape) rendert als Primary.
- [x] Primary schaduw bedraad via `buttonTokens.primary.shadow` (geen hardcoded waarden).
- [x] Primary 1px accent-rand bedraad + zichtbaar (token gecorrigeerd naar borderWidth.1).
- [x] sizeLg 44px hoog via `space['44']` (alle lg-knoppen consistent — Annuleren/Opslaan matchen).
- [x] Kleuren ongemoeid (cluster 7).
- [ ] Visueel bevestigd in-app (open — geen render-pad hier).

## Beslissingsgeschiedenis

- 2026-07-08: Briefing aangemaakt vanuit audit cluster 4.
- 2026-07-08: Beslissingen 1–3 gekozen (iconPosition-prop, Stop→Primary, rand+boxShadow).
- 2026-07-08: Twee token-inconsistenties ontdekt (borderWidth 0, height 56/48/44) — bedraad aan
  token i.p.v. hardcoden; correcties naar Tokens Studio doorgeschoven.
