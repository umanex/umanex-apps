# TC-EBC — Active workout: re-sync frames + gewijzigde tokens

| | |
|---|---|
| **Datum** | 2026-07-13 |
| **Type** | screen |
| **Project** | RowTrack (`apps/rowtrack`) |
| **Klant** | umanex (eigen product) |
| **Status** | gebouwd (spec-parity ok; live render nog te draaien; 1 open vraag) |

> Iteratie op [[2026-07-13-screen-active-workout-redesign]], [[2026-07-13-active-workout-redesign-snapshot]] en [[2026-07-13-component-active-hero-labels]]. Jeroen paste de frames én de tokens opnieuw aan.

---

```
TASK:        Re-sync de active-workout schermen (ActivePhase, portrait + landscape,
             alle doeltypes) naar de opnieuw aangepaste Figma-frames, én verwerk de
             gewijzigde design-tokens (tokens.json → pnpm tokens:build → @/constants).
             Functioneel gedrag ongewijzigd; enkel visuele organisatie + tokens.

CONTEXT:     RowTrack rowing tracker, branch feature/rowtrack-active-workout-redesign.
             ActivePhase.tsx is al eerder gemigreerd + kreeg F3 hero-labels. Nu wijzigden
             de frames én tokens opnieuw → delta bepalen t.o.v. huidige code + bestaande
             snapshot, niet blind herbouwen.

ELEMENTS:    (huidige set — te herbevestigen tegen de nieuwe frames)
             - DOEL-pill (label + waarde) · Stop-knop (header, rechts)
             - Hero: eyebrow-label + getal
             - Subtitle: eyebrow + rij (verstreken · %) of coaching-tekst
             - Progress-bar (portrait horizontaal 4px / landscape verticaal)
             - KPI-lijst (flatte hairline-rijen)
             + gewijzigde tokens: kleur / spacing / type / radii

BEHAVIOUR:   Functioneel identiek — live BLE-updates, Stop → beëindig sessie,
             oriëntatie-switch portrait↔landscape, %-floor, countdown-hero
             (resterend bij doel), doel-bereikt-viering. Geen nieuw gedrag.

CONSTRAINTS: React Native / Expo · StyleSheet (geen inline styles) · tokens uitsluitend
             via @/constants (rebuild uit tokens.json — nooit handmatig; DTCG $value-
             valkuil verifiëren) · portrait + landscape · Ionicons · geen nieuwe deps.
```

---

## Open vragen

- [x] **Scope van de frame-wijziging** — gediff't tegen live frames. Delta = KPI-labels `Afstand`→`Totaal afstand`, `Kcal`→`Totaal Kcal`; None dropt de afstand-KPI-rij (= audit-**F7**, staat al als hero-subtitle); distance-subtitle krijgt `m` ("2.500m"). Hero/progress-bar/header ongewijzigd.
- [x] **Token-bron** — al in de working tree: button-typografie → `AlbertSans_400Regular` + gewichten Light/Regular/Bold toegevoegd (`colors.ts`/`typography.ts`/`style-dictionary.config.mjs`). `tokens.json` schoon, branch niet op remote → niets te pullen; `pnpm tokens:build` idempotent, waarden echt (DTCG ok). Propageert vanzelf via `Button.tsx` (`typeStyles.buttonPrimary/Outline`) → geen code nodig, óók Summary-knoppen.
- [ ] **Split/watts DOEL-pill-copy** — frames tonen `2:20 split` en `180W`; code houdt `2:20/500m` en `180 W`. Bewust **niet** overgenomen: ambigue micro-copy op eerder-buiten-scope varianten, en `/500m` is preciezer. **Bevestigen of de frame-copy de bedoeling is.**
- [x] **Idle / Summary** — active-frames geraakt; Summary erft enkel de button-font via het token (geen aparte frame-wijziging).

## Aannames

- `[ASSUMPTION]` Betreft de active-fase (`ActivePhase.tsx`); idle/summary enkel als de frames dat tonen.
- `[ASSUMPTION]` States/interactie/edge cases ongewijzigd (functioneel identiek).
- `[ASSUMPTION]` Tokens komen als DTCG (`$value`); `pnpm tokens:build` regenereert `@/constants` — geen handmatige edit van tokens.json of constants.

## Acceptatie

- [x] Tokens: `tokens.json` schoon (niets te pullen), `pnpm tokens:build` gedraaid, output op echte waarden (DTCG ok). Button-font propageert via `@/constants`.
- [x] Delta vastgelegd (deze sectie + snapshot-addendum).
- [x] Portrait — parity per doeltype tegen de frame-tekstdumps (KPI-labels, None 5 rijen, distance-subtitle "m"). *(spec)*
- [x] Landscape — zelfde `renderKpiList`; frame-dumps L/None(5)/L/Duration(6)/L/Distance bevestigd identiek. *(spec)*
- [x] Alle labels/waarden via bestaande code + `@/constants` — geen hardcodes.
- [x] Functioneel gedrag ongewijzigd (enkel labels/rij-set/subtitle-string).
- [x] `tsc` groen (exit 0).
- [ ] **Live render-parity** — niet gedraaid: active-fase vereist verbonden erg / geen mock-pad (zelfde blocker). App boot nu wél schoon op de sim (orientation-guard gefixt).
- [ ] **Split/watts pill-copy** — open vraag, niet overgenomen.

## Beslissingsgeschiedenis

- 2026-07-13: TC-EBC aangemaakt — re-sync na hernieuwde frame- + token-wijziging. Scope-delta nog te bepalen via inspectie.
- 2026-07-13: Delta bepaald via frame-tekstdumps + token-diff. Gebouwd in `ActivePhase.tsx`: KPI-labels `Totaal afstand`/`Totaal Kcal`, None-kpiOrder zonder afstand (eigen `duration`-case toegevoegd zodat enkel None de rij dropt), distance-subtitle `${dotted}m`. Token-wijziging (button→Albert Sans) al in `@/constants`, propageert via `Button.tsx`. Split/watts pill-copy bewust open gelaten. tsc groen; live render uitgesteld (mock-pad-blocker).
