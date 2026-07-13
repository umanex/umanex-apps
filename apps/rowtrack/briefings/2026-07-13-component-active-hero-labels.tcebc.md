# TC-EBC — Active-workout hero: dubbelzinnigheid oplossen (audit F3 / P1.3)

| | |
|---|---|
| **Datum** | 2026-07-13 |
| **Type** | component (hero-blok binnen ActivePhase) |
| **Project** | RowTrack (`apps/rowtrack`) |
| **Klant** | umanex (eigen product) |
| **Status** | gebouwd (spec-parity ok; live render-parity nog te draaien) |

> Iteratie op [[2026-07-13-screen-active-workout-redesign]]. Voortkomend uit UX-audit-bevinding **F3 / P1.3** (`apps/rowtrack/audits/2026-07-13-ux-audit-rowtrack-alle-schermen.md`).

---

```
TASK:        Maak het active-workout hero-getal ondubbelzinnig. Bij een duur-/
             afstandsdoel telt de hero AF (resterende waarde), maar niets zegt
             dat — in code géén label, in Figma het FOUTE label "Totale tijd".
             Elke hero moet zelf-verklarend zijn: wat betekent het grote getal,
             en wat de subtitle.

CONTEXT:     ActivePhase.tsx, portrait + landscape. Semantiek per doeltype (code
             regel 216-263): geen doel → hero = verstreken tijd (oploopt);
             duration/distance → hero = RESTEREND (aftelt), subtitle = verstreken
             waarde · "{n}%". Code rendert nu label-loos; Figma-frames dragen wél
             eyebrows ("Totale tijd"/"Afgelegd") — "Totale tijd" boven een
             aftellende 15:00 is fout. Snapshot legde geen eyebrows vast → code
             en Figma zijn uiteen gelopen.

ELEMENTS:    - Hero eyebrow-label (nieuw in code) — per doeltype
             - Hero-getal (bestaand, ongewijzigd)
             - Subtitle eyebrow-label (nieuw in code, duration/distance/none)
             - Subtitle-rij / -tekst (bestaand)

BEHAVIOUR:   - Labels zijn puur presentationeel, afgeleid van goal.type; geen
               nieuwe interactie, geen nieuwe state.
             - Countdown-rekenwerk ongewijzigd (Math.max(0, target−x); %-floor).
             - Edge case doel-bereikt: resterend floort op 0 (bestaand); de
               "Doel bereikt"-viering blijft de afsluiter.

CONSTRAINTS: React Native / Expo · StyleSheet (geen inline styles) · tokens via
             @/constants (geen hardcodes) · casing conform frames (eyebrow UPPER)
             · portrait + landscape · geen regressie op split/watts.
```

---

## Open vragen (opgelost)

- [x] **Disambiguatie-aanpak** — Optie 1 *gelabelde countdown*. Jeroen bevestigde door het Figma-label zelf naar "Resterende tijd" te zetten (aftel-model blijft).
- [x] **Figma-correctie** — Jeroen paste de frames zelf aan → deze taak is code-only sync.

## Aannames

- `[ASSUMPTION]` Countdown-model (hero = resterend bij een doel) blijft — het is bewust gebouwd + staat zo in snapshot en frames. Deze fix labelt het, verandert het niet.
- `[ASSUMPTION]` Wording-default bij Optie 1: `RESTEREND` (hero) + `AFGELEGD` (subtitle) + `TOTALE TIJD`/`TOTALE AFSTAND` (geen doel). Alternatieven: "NOG TE GAAN", "VERSTREKEN".
- `[ASSUMPTION]` Split/watts krijgen voor consistentie een eyebrow ("HUIDIGE SPLIT"/"HUIDIGE KRACHT"); hun coaching-subtitle blijft.

## Acceptatie

- [x] Geen doel: eyebrow "TOTALE TIJD" boven verstreken tijd; subtitle-eyebrow "TOTALE AFSTAND" boven afstand. *(spec)*
- [x] Duur-doel: eyebrow "RESTERENDE TIJD" boven het aftellende getal; subtitle-eyebrow "AFGELEGD" boven verstreken · "{n}%". *(spec)*
- [x] Afstand-doel: eyebrow "RESTERENDE AFSTAND"; subtitle-eyebrow "AFGELEGD" met resterende/verstreken meters. *(spec)*
- [x] Split/watts: hero blijft huidige waarde; consistente eyebrow ("HUIDIGE SPLIT 500/M" / "HUIDIGE KRACHT") uit hun frames; coaching-subtitle zonder eyebrow; geen regressie. *(spec)*
- [x] Portrait én landscape: gedeelde `renderHeroContent` → beide gelabeld. *(spec; visuele balans nog niet live bevestigd)*
- [x] Alles via tokens uit `@/constants` — geen hardcodes (SemiBold 16 via `fontFamily`/`fontSize['16']`, gap via `space['40']/['8']`, kleur `fg.onAccent`).
- [x] `tsc` groen (exit 0).
- [ ] **Live render-parity op iOS-sim/toestel** — niet gedraaid: active-fase vereist verbonden erg / geen mock-pad om doel-states te forceren (zelfde blocker als [[2026-07-13-screen-active-workout-redesign]]). Metro draait → hot-reload; te bevestigen op toestel met een duur-doel.

## Beslissingsgeschiedenis

- 2026-07-13: TC-EBC aangemaakt uit audit-F3. Kern: code rendert label-loos, Figma labelt de countdown-hero fout ("Totale tijd" bij resterende 15:00). Aanpak-keuze staat open.
- 2026-07-13: Optie 1 gekozen (Jeroen zette Figma-label → "Resterende tijd"). Code-only sync gebouwd: eyebrow-strings per doeltype in `computeGoalView`, gedeelde `renderHeroContent` (portrait+landscape), twee-groepen-structuur (paneel-gap 28→40, groep-gap 8), eyebrow-stijl SemiBold 16/20%/UPPER/`fg.onAccent`. Split/watts kregen hun frame-eyebrow mee voor consistentie. tsc groen; live render-parity uitgesteld (mock-pad-blocker).
