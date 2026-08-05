# TC-EBC — Connect-overlay: BLE-verbinding tijdens actieve workout (audit cluster 8)

- **Datum:** 2026-07-08
- **Type:** component (full-screen overlay met states)
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gepland — design-beslissingen genomen, klaar voor Figma-build

---

```
TASK:        De full-screen verbindings-overlay (spinner + statusteksten + error) van de actieve
             workout een Figma-design geven.
CONTEXT:     Audit cluster 8 (MIDDEL). components/workout/ActivePhase.tsx r585-605 rendert deze
             overlay zolang de BLE-roeier niet verbonden is (phase active). Geen Figma-frame dekt
             deze states; de bestaande shared-chrome dekt alleen de BleStatusBar/HrStatusBar-balken
             (node 21:485 / 21:515), niet deze overlay. Legacy font (Inter) via connectionText.
ELEMENTS:    Gecentreerde spinner (ActivityIndicator, accent, large) + statustekst; error-variant:
             warning-outline-icoon (fg.secondary, 40) + fouttekst + 'Opnieuw proberen' ghost-knop.
BEHAVIOUR:   Auto-getoond zolang bleStatus !== 'connected'. Statustekst volgt de BLE-fase:
             idle/scanning → 'Zoeken naar roeier...', connecting → 'Verbinden...', discovering →
             'Services ontdekken...', reconnecting → 'Opnieuw verbinden...', disconnecting →
             'Verbinding verbreken...'. Error → icoon + bleError + retry-knop (startScan).
CONSTRAINTS: RN/Expo · token-only · StyleSheet · geen modal (inline overlay binnen het scherm) ·
             de vijf status-strings zijn vast · error-icoon nu fg.secondary (neutraal, niet rood).
```

---

## Beslissingen (2026-07-08, door Jeroen)

- **Visuele rijkdom (vraag 1+2):** **uitbundig / gamified** — geen kale spinner maar een
  illustratie/animatie, mag per BLE-fase verschillen. Sterkere gamification-toon.
- **Error-state (vraag 3):** error-icoon naar **accent-rood / `status.error`** (duidelijk falen,
  vgl. cluster 7 verkeerslicht-semantiek); retry-knop blijft ghost.
- **Type-DNA (vraag 4):** **migreren** — statustekst → Source Serif / Albert Sans (weg van Inter).
- **Edge cases (vraag 5):** aparte 'niets gevonden'-state met retry + hint na timeout ontwerpen.

---

## Open vragen (design-beslissingen)

1. **Visuele behandeling (kritisch):** blijft het een kale `ActivityIndicator`-spinner, of een
   rijkere connecting-visual (BLE/roeier-icoon met puls-animatie, illustratie)? *Meest plausibel:
   spinner + klein roeier/BLE-icoon met subtiele puls — past bij de gamification-toon.*
2. **Status-iconografie (kritisch — states):** de vijf verbind-fasen delen nu één spinner + wisselende
   tekst. Elke fase een eigen icoon/illustratie, of één visual met alleen wisselende tekst?
   *Meest plausibel: één visual, wisselende tekst — eenvoud.*
3. **Error-state accent:** het error-icoon is nu `fg.secondary` (neutraal grijs). Naar accent-rood /
   `status.error` tillen zodat falen duidelijk leest (vgl. cluster 7 verkeerslicht-semantiek)?
   *Meest plausibel: error-icoon → status.error/accent, retry-knop blijft ghost.*
4. **Type-DNA (kritisch, gedeeld):** connectionText = `bodyRegular` (Inter, legacy). Migreren naar
   Source Serif of Albert Sans? *Meest plausibel: statustekst → Source Serif italic (zoals de
   textLink/connector-taal), of Albert Sans label — beslissen.*
5. **Edge cases (kritisch):** (a) 'geen roeier gevonden' na een timeout — aparte empty-achtige state
   met tips, of blijft het 'Zoeken...'? (b) lange `bleError`-tekst; (c) HR-only vs rower-verbinding.
   *Meest plausibel: aparte 'niets gevonden'-state met retry + hint na timeout.*

## Aannames

- `[ASSUMPTION]` Component-typologie = inline full-screen overlay binnen ActivePhase (geen Modal).
  Blijft zo.
- `[ASSUMPTION]` Interactie = passief (auto), behalve de retry-knop (klik) in de error-state.
- `[ASSUMPTION]` Relatie tot BleStatusBar (21:485): de overlay is de full-screen tegenhanger van de
  compacte statusbalk; visuele taal op elkaar afstemmen.
- `[ASSUMPTION]` Eén component-frame met varianten: connecting (default) / error / [niets-gevonden].

## Acceptatie

- [ ] Connecting-visual (vraag 1) vastgelegd (spinner vs rijker).
- [ ] Status-iconografie-beslissing (vraag 2) toegepast op de 5 fasen.
- [ ] Error-state (vraag 3): icoon-kleur + retry-knop als variant.
- [ ] Type-DNA (vraag 4) toegepast op de statustekst.
- [ ] Edge-case-states (vraag 5) beslist en waar gekozen ontworpen.
- [ ] Figma token-bound; figma-map.md aangevuld (nieuwe rij 'Workout / Connect Overlay').

## Beslissingsgeschiedenis

- 2026-07-08: Briefing aangemaakt vanuit audit cluster 8 (design-backlog).
- 2026-07-08: Kruisbeslissingen genomen — uitbundig/gamified visual (per-fase illustratie mogelijk),
  error-icoon → accent/status.error, DNA migreren, aparte 'niets gevonden'-state. Scope-uitbreiding
  t.o.v. huidige kale spinner.
