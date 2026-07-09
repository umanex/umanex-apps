# TC-EBC — Home-scherm re-sync met bijgewerkt Figma-design

- **Datum:** 2026-07-09
- **Type:** screen
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gebouwd (visuele parity-check op device open)

---

```
TASK:        Home-scherm (app/(tabs)/index.tsx) her-synchroniseren met het bijgewerkte
             Figma-design (node 16:159).
CONTEXT:     Home bestaat en is eerder geaudit + LAAG-gepolisht. Het design is nu in Figma
             aangepast; wat precies is onbekend — te bepalen via Figma-inspectie + diff tegen
             de huidige code (figma-naar-code skill).
ELEMENTS:    Begroeting + subtitel, PR-rij (KpiSingle ×2–3), GoalProgressCard (weekdoel-waarde
             + progressbar + statusregel), 'Recente trainingen' (Subtitle + WorkoutCard-lijst),
             Start-knop (header). States: loading, geen workouts, geen periodedoel.
BEHAVIOUR:   Presentatie-scherm. Start → nieuwe workout; workout-rij → detail; 'wijzig' → doel
             bewerken. Exacte layout-/gedrags-deltas volgen uit de Figma-diff.
CONSTRAINTS: RN/Expo · uitsluitend tokens uit @/constants (geen hardcoded) · StyleSheet ·
             Ionicons · Figma Console MCP via Desktop Bridge · pixel-accuraat tegen node 16:159 ·
             bestaande states/gedrag behouden tenzij het design ze wijzigt.
```

---

## Open vragen

(geen — bestaand scherm; component-typologie, states en interactie zijn bekend. Specifieke deltas volgen uit de Figma-inspectie.)

## Aannames

- `[ASSUMPTION]` Visuele/layout-aanpassingen aan het bestaande Home-scherm, geen nieuwe flow of nieuw datamodel.
- `[ASSUMPTION]` De drie state-varianten (loading/empty/geen-doel) blijven bestaan (project-conventie), ook als het Figma-frame alleen de gevulde staat toont.

## Acceptatie

- [x] Home-diff bepaald (deep-read vs code): enige echte wijziging = recente-lijst full-bleed/flush/highlight; bovenblok (header, WEEKDOEL, PR, progressbar) matchte al exact.
- [x] Recente-lijst-rework toegepast, token-gebonden (bg.raised, space, accent, Ionicons); geen hardcoded.
- [x] Loading/empty/geen-doel-states behouden.
- [x] tsc groen; interacties (Start, rij→detail, wijzig) ongewijzigd.
- [ ] Visuele parity-check (code-render vs Figma) — **overgeslagen, geen render-pad**; device-eyeball open.

## Beslissingsgeschiedenis

- 2026-07-09: Aangemaakt n.a.v. Jeroens vraag om het bijgewerkte Home-design te syncen. Uitvoering via de figma-naar-code skill.
- 2026-07-09: Diff via deep-read (subagent). Enige design-wijziging = 'Recente trainingen' heropgezet naar full-bleed flush tegels (gap 0, geen rij-borders, paddingV 12, marginH-breakout) met `bg.raised`-highlight + vector-pijl. Highlight geïmplementeerd als **pressed/tap-state** (Pressable i.p.v. TouchableOpacity-opacity) — te bevestigen of het een permanente/data-gedreven highlight moet zijn. Greeting blijft Source Serif (Figma-Newsreader = authoring-slip). PR-decimalen (100.45 vs 100.5) = sample-data, formatter ongemoeid. Parity-check op device open.
