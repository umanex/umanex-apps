# RowTrack — Figma ↔ Code mapping

Single source of truth voor welke code-eenheid bij welk Figma frame hoort.
Bijwerken bij elke Figma re-organisatie of nieuwe screen/component.

**Figma file**: https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=0-1&t=k6rKeRyqVNPmF9Pn-1
**Laatst gesynct**: 2026-05-11

Lege `node-id` kolom = nog niet gemapt of nog niet in Figma. Verwijder rijen
voor gedeprecate code.

---

## Screens (`app/(tabs)/`)

| Code | Figma node-id | Frame naam |
|---|---|---|
| `app/(tabs)/index.tsx` | `` | Dashboard / Home |
| `app/(tabs)/workout/index.tsx` | `` | Workout (container) |
| `app/(tabs)/history/index.tsx` | `` | History / List |
| `app/(tabs)/history/[id].tsx` | `` | History / Detail |
| `app/(tabs)/profile/index.tsx` | `` | Profile |

## Workout — phases & overlays

| Code | Figma node-id | Frame naam |
|---|---|---|
| `components/workout/ActivePhase.tsx` (portrait) | `` | Workout / Active / Portrait |
| `components/workout/ActivePhase.tsx` (landscape) | `` | Workout / Active / Landscape |
| `components/workout/ActivePhase.tsx` (summary) | `` | Workout / Summary |
| `components/workout/ProgressBar.tsx` | `` | Workout / Progress Bar |
| `components/workout/Confetti.tsx` | `` | Workout / Confetti (animatie) |
| `components/GoalSetupModal.tsx` | `` | Workout / Goal Setup Modal |
| `components/MotivationalToast.tsx` | `` | Workout / Motivational Toast |
| `components/MilestoneOverlay.tsx` | `` | Workout / Milestone Overlay |
| `components/PaceZone.tsx` | `` | Workout / Pace Zone |
| `components/SplitsList.tsx` | `` | Workout / Splits List |

## Components — atoms

| Code | Figma node-id | Component naam |
|---|---|---|
| `components/Button.tsx` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=64-14082&t=k6rKeRyqVNPmF9Pn-4` | Atoms / Button |
| `components/Card.tsx` | `` | Atoms / Card |
| `components/Chip.tsx` | `` | Atoms / Chip |
| `components/Dot.tsx` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=67-14291&t=k6rKeRyqVNPmF9Pn-4` | Atoms / Dot |
| `components/Icon.tsx` | `` | Atoms / Icon |
| `components/Segment.tsx` | `` | Atoms / Segment |
| `components/Subtitle.tsx` | `` | Typography / Subtitle |
| `components/TabLabel.tsx` | `` | Navigation / TabLabel |

## Components — molecules

| Code | Figma node-id | Component naam |
|---|---|---|
| `components/FormField.tsx` | `` | Forms / FormField |
| `components/GoalInput.tsx` | `` | Forms / GoalInput |
| `components/GoalSegments.tsx` | `` | Forms / GoalSegments |
| `components/MetricDisplay.tsx` | `` | Data / MetricDisplay |
| `components/SectionHeader.tsx` | `` | Layout / SectionHeader |
| `components/SummaryRow.tsx` | `` | Data / SummaryRow |
| `components/EmptyState.tsx` | `` | Feedback / EmptyState |
| `components/ErrorMessage.tsx` | `` | Feedback / ErrorMessage |
| `components/BleStatusBar.tsx` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=21-485&t=k6rKeRyqVNPmF9Pn-4` | Status / BleStatusBar |
| `components/HrStatusBar.tsx` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=21-515&t=k6rKeRyqVNPmF9Pn-4` | Status / HrStatusBar |
| `components/WorkoutCard.tsx` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=56-13791&t=k6rKeRyqVNPmF9Pn-4` | Cards / WorkoutCard |
| `components/GoalProgressCard.tsx` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=64-14031&t=k6rKeRyqVNPmF9Pn-4` | Cards / GoalProgressCard |


### `IdlePhase.tsx` variants

| Variant | url |
|---|---|
| `goalType=none` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1506&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=duration` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1508&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=distance` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1510&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=watts` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1514&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=split` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1512&t=k6rKeRyqVNPmF9Pn-4` |

---

### `ActivePhase.tsx` variants

#### Portrait

| Variant | url |
|---|---|
| `goalType=none` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=5-3&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=duration` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5387&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=distance` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5431&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=split` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5463&t=k6rKeRyqVNPmF9Pn-1` |
| `goalType=watts` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5495&t=k6rKeRyqVNPmF9Pn-4` |


#### Landscape

| Variant | url |
|---|---|
| `goalType=none` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=5-4&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=duration` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5712&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=distance` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5741&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=split` | `hhttps://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5770&t=k6rKeRyqVNPmF9Pn-4` |
| `goalType=watts` | `https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=42-5799&t=k6rKeRyqVNPmF9Pn-4` |


---

## Gebruik (voor Claude Code)

Bij elke Figma-gerelateerde taak:
1. Lees deze file
2. Vind de juiste `node-id` op basis van het code-pad
3. `get_design_context` (of `get_metadata` / `get_screenshot`) op die node
4. Pas code aan via tokens

Bij screen-varianten (portrait/landscape, summary phase, etc.) staat de
variant tussen haakjes achter het pad — match exact.

## Onderhoud

Werk dit bestand bij:
- bij hernoemen of verplaatsen van Figma frames
- bij nieuwe screens of components
- bij verplaatsen of hernoemen van code-files
- bij deprecation (verwijder rij)

Eén commit per batch-update: `docs(rowtrack): sync figma-map`.

## Node-id vinden in Figma

Selecteer het frame of component → rechtermuis → *Copy link to selection*.
Format: `figma.com/design/{fileId}/...?node-id=12-340`. Neem alleen het
`12-340` deel over.