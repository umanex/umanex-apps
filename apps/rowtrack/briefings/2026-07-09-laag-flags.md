# Audit LAAG-sweep — flag-lijst voor device-review (2026-07-09)

Items die bewust NIET blind gefixt zijn tijdens de per-gebied LAAG-sweep — ze
vergen jouw device-oog (optisch), een token-beslissing, of zijn een design-bug.
Per gebied. SAFE-FIX-items zijn wél toegepast en per gebied gecommit.

## Home — gedaan (commit 9888ad9): Dot-kleur, status/connector-spacing, track-radius
Flags:
- `KpiSingle` waarde↔label gap 4→0: gedeeld over 5 gebieden — design-system-beslissing, niet blind globaal.
- GoalProgressCard connector `paddingBottom` (optische baseline van 'van' onder groot cijfer).
- Subtitle-pijl glyph→vector: gedeelde component, inline-icoon-alignment (render-check).
- PR-tijdformaat mm:ss + snelste-split PR: mogelijk bewuste sample-data / iteratie-frame.
- Begroeting 'Newsreader Italic': font zit niet in de app (design-slip); code = Source Serif Italic.

## Workout — Actieve fase, portrait — 13 DONE, 0 SAFE-FIX (gebied al geremedieerd)
Flags:
- Doel-pill eenheid niet italic / niet apart element: vergt structurele split waarde+unit in 2 Text-nodes; spiegel-beslissing met landscape.
- Doel-pill compact format ('20 min' / '20 km' i.p.v. '20:00 MIN'): edge-case-gedrag bij niet-ronde doelen niet in design gespecificeerd.
- Doel-pill achtergrond 10% opacity: geen token (subtle=6%, muted=12%) — token-beslissing nodig.
- Progressbar volle breedte vs 20px inzet: risico dat 96px hero-cijfer wrapt bij paddingHorizontal.
- Distance-subtitel komma vs punt ('5,0 km'): NL-komma waarschijnlijk correct; design-punt is de afwijking (design-bug).

## Workout — Actieve fase, landscape — 15 DONE, 0 SAFE-FIX (gebied al geremedieerd, cluster 5)
Flags:
- Duration-KPI toont AFSTAND i.p.v. TIJD: goal→content-logica, spiegelt portrait; TIJD dupliceert de duur-subtitel — mogelijk design-slip. Beslissing + op beide toepassen.
- Doel-pill italic unit (= portrait): structurele split waarde+unit.
- Doel-pill 10% opacity (= portrait): geen token.
- Hero-tekstkleur fg.primary vs wit: design zelf-inconsistent (3× fg.primary, 2× wit) — niet volgen.
- Split/watts balk-inset 20px: design zelf-inconsistent — niet volgen.
- Watts hero-gap 28 vs 16: design zelf-inconsistent — niet volgen.
- Watts 2e KPI-label: missing-in-design, code is correct — geen wijziging.

## History — lijst — gedaan: segment-container radius (radii.sm→radii.xs)
Flags:
- `TabItem` horizontale padding 12→20: gedeeld met History-detail; +16px riskeert truncatie van "Overzicht" op de 3-tab detailscherm. Holistisch beslissen.
- KPI-grid cell-padding vs kolom-gap: optische alignment (4–6px shift), structureel — device-oog.
- `KpiSingle` gap 4→0 (= Home): blast-radius Home/History-lijst/History-detail/ActivePhase — design-system-beslissing.
- Totale-duur eenheid 'uur'/'min' ontbreekt in design: missing-in-design, code completer — product-keuze.
- Workout-rij pijl glyph→vector (= Home Subtitle): icoon-keuze + sizing 9×8.
- Loading/empty-state alleen in code: verplichte states, niet verwijderen.
- `Segment.tsx` matcht geen Figma-variant: component heeft 0 usages (dode code) — delete vergt bevestiging, aparte cleanup.
- Source Serif Pro vs Source Serif 4: bewuste, gedocumenteerde equivalentie — geen fix.

## Workout — Samenvatting — gedaan: PR-banner radius+lineHeight, statstabel border+radius, rij-labels fg.secondary
Flags:
- KPI-overzichtsblok full-bleed + `bg.raised`-band: edge-to-edge breakout (negatieve marge) — vergt render-pad. Grootste geflagde item van dit gebied.
- KPI-grid verticale/cel-spacing: verweven met de full-bleed refactor — samen doen.
- DUUR-cel toont 'uur'/'min' unit: missing-in-design, code informatiever — product-keuze.
- GEM/PIEK-kolommen flex vs vaste 67px + gap: optische kolom-alignment (meerdere verweven waarden) — device-oog.
- `KpiSingle` gap 4→0 (= Home/History): blast-radius 4 files/~12 instanties — design-system-beslissing.

## Workout — Idle-fase — gedaan: nudge/wheel serif-tint tokens, GoalSegments inactief-icoon, '5 s', status-bar radius+dot
Flags (14):
- **NudgeRow herbouw (#2) + nudge-waarde→serif (#3)**: samen — structurele merge naar één balk + typografie (Inter→Source Serif). Grootste item; device-review. (Was al eerder uitgesteld.)
- Segmented control breedteverdeling (#5): inactief-fill vs actief-hug raakt IdlePhase + GoalSetupModal + geeft label-jitter — design/UX.
- WheelPicker rijhoogtes 40/56/40→44 (#6): breekt snap-math, gedeeld (2 schermen) — hoog risico.
- Chip actief-bg 0.20 vs 0.12 (#8): geen 0.20-token (subtle 6% / muted 12%) — token-wijziging in tokens.json.
- Chip hoogte 44→40 (#11): zakt onder 44pt touch-target — a11y-afweging.
- Chip unit split/italic (#12) + duur-chip '1:30 u'-formaat (#13): structureel / formatter-ripple.
- Decimaal komma vs punt (#14) + design off-token slate-kleuren (#25): design-bugs, code volgt correct de tokens.
- 'Verbreken' vs 'Verbreek' (#19): copy, design intern inconsistent.
- 'Opnieuw'/spinner (#20) + disabled nudge-state (#26): code completer — behouden.
- Segments↔NudgeRow gap-conflict (#21/#22): één `doelSection.gap` bedient twee targets — conditionele restructuur.

## Overlays & Motivational Toast — 2 DONE, 0 SAFE-FIX (code al token-correct / herbouwd)
Flags:
- Cyaan vs rood knop/border/tekst (#1-4): Figma-frame gebruikt verouderd cyaan-schema (#00E5FF) = top-level beslispunt #2/#4; code is correct rood/`accent`. Geen fix, Figma bijwerken.
- MilestoneOverlay (#5) + confetti strips/palet (#9/#10): cluster-8 gamified-backlog — jouw creatieve werk.
- Off-token design-waarden (#7 kaart-bg #1A1F2E, #8 body #AAAAAA, #13 scrim 0.85 vs token 0.7): code volgt al de tokens; design wijkt af — token-beslissing (evt. `scrimStrong`-token).
- Kaarthoogte vast 340 vs content-hug (#11): code hugt (robuuster bij dynamische copy) — behouden.
- **NIEUW: hardcoded goud `#FFD700`** in MotivationalToast (titel + 🏆, r200): geïntroduceerd door de viering-herbouw; geen goud-token (`achievement.default`=#E8DCC4 cream is nearest maar visueel anders). Token-beslissing — token-discipline-gap in recente code.

## Design tokens — 4 DONE (cluster-1 DTCG), 0 SAFE-FIX — ALLES Tokens-Studio/Figma-actie (Jeroen)
`constants/` is auto-generated — nooit handmatig. Alle flags horen in `tokens.json` of Figma:
- **Ontbrekende tokens aanmaken**: accent @0.20 (chip/segment 0.20-hardcode), `status/error`, `scrim`/`scrimStrong` (overlay 0.7 vs toast 0.85), goud (voor #FFD700), alpha/opacity/fontWeight-primitieven.
- **Component-tokenlaag grotendeels niet geëxporteerd**: goalPill, kpiTile, prBadge, segmentedControl, splitRow, statusBar, tabBar-kleuren, textLink; progressBar-tokens onvolledig.
- **Component-hardcodes** (geblokkeerd op bovenstaande tokens): `TabItem`/`GoalSegments` rgba 0.20, `Icon` default #FFFFFF, `MotivationalToast` confetti+#FFD700+scrim, `IdlePhase` rgba(0,0,0,0.5), `ActivePhase` PR-banner rgba(245,158,11,0.15).
- **Legacy typografie-sets** display/body/label/mono (Barlow/Inter/JetBrains) + legacy fontFamily/fontSize-keys: opruimen zodra geen consumer meer (auth was de laatste — checken).
- **Missing-in-Figma / bewust**: radii cardSm/modal/3xl, layout screenHorizontal/navHeight, spacing-aliassen, `status`/`blue` backwards-compat, Source Serif Pro↔4-mapping (bewust).

## History — detail — gedaan: splitsDist-label fg.secondary, tabBar radius xs, header-gap 0, BPM-labels tweeregelig
Flags (13):
- Verwijder-knop trailing pijl (#3): forward-pijl op een delete-knop is semantisch ongewoon — icoon-keuze/UX.
- 28px verticaal ritme (#7): gecoördineerde 3-property-wijziging, tab-bar zakt 16px — device-review.
- Back-link '← OVERZICHT' glyph→vector (#9): structuur, icoon-shape-keuze.
- KPI-grid kolomafstand (#10) + kolom-gap/rechterpadding tabelrijen (#12): flex vs vaste-67px-kolom-model, Hartslag-tab-blast — device-oog.
- `KpiSingle` gap 4→0 (#11): **20 usages/4 files** (meer dan gedacht) — design-system-beslissing.
- DUUR-KPI unit (#13) + BPM-KPI 'bpm'-unit (#14): design verbergt units; code informatiever — content-beslissing (als paar).
- Verwijder-knop gap 8→10 (#16) + tekst 18→16 (#17): gedeelde `Button` outline-variant, raakt ook 'Annuleren' — variant-scoped fix, device-review.
- `TabItem` padding 12→20 (#18): gedeeld History-lijst+detail, truncatie-risico.
- HR-tab conditioneel (#19) + loading/empty/not-found (#20): code completer — behouden.

## Gedeelde chrome — 9 DONE (clusters 4/6/7), gedaan: Button icoon-gap 8→10
Flags:
- **Chip actief-behandeling — SCOUT-CONFLICT**: Idle-scout las tint `accent` @0.20; chrome-scout las *solid* `accent.default` + `fg.primary`-tekst. Vergt Figma-verificatie vóór fix (`Chip.tsx:33-48`, enige gebruik = IdlePhase recents).
- Hart-glyph fontFamily (#10): design wil Inter 14; herintroduceert legacy-font tegen DNA + hoort bij glyph-vs-Ionicons-vraag.
- `SectionHeader` (#21): 0 usages (dode code) — cleanup-delete-beslissing (= `Segment.tsx`).
- Connected-indicator groen (#2): beslispunt, code correct (cluster 7) — Figma bijwerken.
- 'Verbreek' vs 'Verbreken' (#8): copy, design intern inconsistent.
- Scanning/error-states (#11) + destructive/ghost-varianten (#18): missing-in-design, code completer.
- Default Chip-labelkleur #94A3B8 (#13): design-slate non-token, code = fg.secondary correct.
- `TabItem` padding 12→20 (#19) + icon-variant (#20): gedeeld + truncatie / feature-beslissing.

## Profile + bewerk-sheets — 3 DONE, 0 SAFE-FIX (non-token design + geflagde redesigns + blast-radius)
Flags (25, gegroepeerd):
- **Non-token design-kleuren** (code al token-correct): Opslaan/segmented cyan #00D4FF/#00E5FF (beslispunt #2), witte borders als design-taal, slate #47556E/#94A3B8/#1A1F2E, puur wit → Figma/token-beslissingen.
- **Geflagde Profile-redesigns**: segmented control, **sheet-padding 20→32** (scout: verified-clean easy-win — BottomSheet enkel in profile, alle 7 sheets willen 32, `space['32']` bestaat — mits jouw OK), rij-volgorde (Geslacht→Geboortedatum→Lengte→Gewicht), stepper/NudgeRow, WheelPicker (VISIBLE 3 vs 5, Inter vs Source Serif).
- **Copy** (jij beslist): 'E-mailadres' vs 'Email', e-mailsheet-labels, geboortedatum-formaat ('11 jul 1989' vs '11/07/1989').
- **Missing-in-design, code completer** (behouden): MIJN DOEL-label, empty/error/version-states, DAG/MAAND/JAAR-labels.
- **Gedeelde blast-radius**: Button (overal), WheelPicker (IdlePhase+profile), GoalProgressCard-borders (Home+profile).
- Chevron Ionicons vs design-glyph '›' (#11): design wil glyph — botst met project-conventie (Ionicons, geen glyphs).
