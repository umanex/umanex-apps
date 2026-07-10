# TC-EBC — WheelPicker finetune (edge-fade + verticale centrering)

| Veld | Waarde |
|------|--------|
| Datum | 2026-07-10 |
| Type | component |
| Project | rowtrack |
| Klant | umanex (eigen product) |
| Status | gevalideerd |

Vervolg-finetuning op [2026-07-09-component-wheel-picker.tcebc.md](./2026-07-09-component-wheel-picker.tcebc.md).

---

```
TASK:        (1) Klassevollere fade op de scrollwheel-randen: de eerste/laatste waarden vloeien zacht weg naar de achtergrond i.p.v. hard afgeknipt op 0.5 opacity. (2) De picker-ruimte (chips + wheel) verticaal centreren tussen de segments en de Start-CTA, responsief over schermgroottes.
CONTEXT:     IdlePhase DOEL-sectie. Bestaand component, visuele/layout-verfijning.
ELEMENTS:    WheelPicker met top+bottom LinearGradient-overlay (bg.base → transparant); picker in een flex-gecentreerde zone onder de segments.
BEHAVIOUR:   Randrijen faden vloeiend naar bg.base (edge-dissolve bovenop de bestaande per-rij opacity); de picker blijft verticaal gecentreerd bij elke schermhoogte; ScrollView scrollt enkel als de inhoud niet past (flexGrow-fallback).
CONSTRAINTS: React Native + Expo. RowTrack-tokens; fade via expo-linear-gradient (masked-view niet geïnstalleerd). Native-driver interpolatie behouden. Fade-transparant = bg.base @ alpha 0 (afgeleid van token, met comment).
```

---

## Open vragen

- Geen blokkerende. Geen-variant: de "Vrije training…"-tekst deelt de gecentreerde zone (consistent); bijstelbaar indien gewenst.

## Aannames

- [ASSUMPTION] Fade naar `bg.base` (de picker staat op bg.base). MaskedView (fade-naar-transparant) zou algemener zijn maar vereist een niet-geïnstalleerde package → LinearGradient-overlay.
- [ASSUMPTION] Verticale centrering via een top-groep (header/devices/segments, natuurlijke hoogte) + een `flex:1` gecentreerde picker-zone, binnen een ScrollView met `flexGrow:1` contentContainer.

## Acceptatie

- [ ] Eerste/laatste wheel-waarden faden vloeiend naar bg.base (geen harde clip-rand).
- [ ] Picker (chips + wheel) verticaal gecentreerd in de ruimte tussen segments en CTA; past zich aan aan schermhoogte.
- [ ] Kleine schermen: scrollt als de inhoud niet past (geen afgeknipte content).
- [ ] Native-driver opacity/cross-fade + snap/haptics ongewijzigd; tokens; typecheck groen; live parity op simulator.

## Beslissingsgeschiedenis

- 2026-07-10: TC-EBC opgesteld. Edge-fade via LinearGradient-overlay; verticale centrering via flex-gecentreerde picker-zone.
