# TC-EBC — UX-audit P3-verzamellijst (F13–F19)

- **Datum:** 2026-09-14
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gebouwd

---

```
TASK:        De zeven P3-bevindingen uit de UX-audit van 2026-07-16 afsluiten — elk
             gebouwd, of verworpen met een reden die telbaar is.

CONTEXT:     `audits/2026-07-16-ux-audit-rowtrack.md` §5, via BACKLOG-item 2026-09-07.
             Her-triage op 2026-09-14 gemeten tegen de code van vandaag: twee van de
             zeven zijn onderweg al opgelost, één is deels opgelost, één wordt bewust
             verworpen. Er blijven drie te bouwen.

ELEMENTS:    KpiRow (BPM-rij, active-scherm) · de samenvatting-Modal (ActivePhase) ·
             SummaryKpiBand + één legenderegel · ActivePhase-props · KPI.tsx,
             SectionHeader.tsx, SplitsList.tsx en hun stories + Figma-pagina's.

BEHAVIOUR:   F15 — de BPM-rij zegt wat een tik doet zolang er geen band hangt, en zwijgt
             zodra tikken niets meer oplevert.
             F16 — Android-back op de samenvatting doet hetzelfde als "Ga verder"; de
             toestemmingsgate blijft bewust niet wegklikbaar.
             F19 — het sterretje achter kcal krijgt één regel uitleg in de samenvatting,
             alleen zichtbaar wanneer het sterretje er staat.

CONSTRAINTS: Alleen rollen uit de tokenlaag, geen rauwe kleur of maat. Elke zichtbare
             wijziging gaat door de Figma-keten (frame bijwerken, beelden exporteren,
             beeld-basislijn opnieuw meten op béide platformen). Geen nieuwe component:
             alles gebeurt in bestaande. Portrait én landscape op het active-scherm.
```

---

## Open vragen

Geen — de twee die er waren zijn op 2026-09-14 beantwoord (zie Beslissingsgeschiedenis).

## Aannames

- `[ASSUMPTION: F16]` Android-back op de samenvatting mag niet stil sluiten zonder op te
  slaan; de enige uitgang die het scherm vandaag heeft is "Ga verder" (`onContinue`), dus
  back krijgt dezelfde handler. Alternatief was back negeren, wat op Android als een
  vastzittend scherm leest.
- `[ASSUMPTION: F19]` De legende staat alleen in de samenvatting, niet op het
  active-scherm: daar concurreert een uitlegregel met de metrics tijdens een inspanning.
  Dit volgt R1 uit de audit zelf ("één regel uitleg in de summary").

## Acceptatie

- [x] F13 — gesloten op meting, niet op herinnering: `backLink` is 'HISTORIEK', niet 'OVERZICHT' — bewijs: `grep -n backLink i18n/translations/nl.ts` → regel 280 `backLink: 'HISTORIEK'`, nul treffers op 'OVERZICHT'
- [x] F17 — gesloten op meting: de doelloze KPI-lijst bevat geen AFSTAND — bewijs: `ActivePhase.tsx` default-tak `kpiOrder = ['SPLIT','WATT','SPM','BPM','KCAL']`, gelezen op regel 256 mét de comment die de reden noemt
- [x] F14 — verworpen mét reden in BACKLOG.md, en de reden noemt de breedte én het a11y-label — bewijs: entry 2026-09-07 in `apps/rowtrack/BACKLOG.md`, Status-regel noemt 430px, de afgewezen gelijk-brede variant en `accessibilityLabel`
- [x] F15 — de BPM-rij toont zijn affordance uitsluitend wanneer `onPress` actief is — bewijs: browser-meting op de gebouwde story `ActivePhase/Zonder Hartslagband`: waardenode 'Verbind' in `rgb(240,84,84)` tegen `rgb(242,244,250)` voor elke andere waarde in dezelfde lijst
- [x] F15 — de affordance verdwijnt zodra de rij `disabled` is (band verbonden, scan loopt, wachtend) — bewijs: zelfde meting op `ActivePhase/Playground` (band verbonden → BPM-getal in fg.primary) en `ActivePhase/Hartslag Zoeken` (scan → spinner, geen 'Verbind')
- [x] F16 — de samenvatting-Modal draagt `onRequestClose` en die roept dezelfde handler als "Ga verder" — bewijs: `ActivePhase.tsx:440` `onRequestClose={onContinue}`, dezelfde handler als de Button op regel 470
- [x] F16 — HealthConsentScreen blijft zonder `onRequestClose`, met de reden in de code — bewijs: `HealthConsentScreen.tsx:66` draagt het blok 'BEWUST GEEN `onRequestClose`' boven de Modal
- [x] F19 — de legenderegel staat er alleen wanneer het sterretje er staat (geen profielgewicht) — bewijs: gemeten op de node `[data-testid="SummaryKpiBand"]` van `ActivePhase/Samenvatting Zonder Gewicht`: bandtekst eindigt op '238* | kcal | ENERGIE | … | * Schatting op een standaardgewicht…'
- [x] F19 — de legenderegel staat er niet wanneer er wél een profielgewicht is — bewijs: zelfde meting op `ActivePhase/Samenvatting`: '238 | kcal | ENERGIE', geen sterretje en geen legende. (Een eerdere meting op `#storybook-root` gaf hier een vals negatief: de Modal portaleert buiten die wortel.)
- [x] F18 — `paceZone`, `isCountdown` en `pulseAnim` bestaan nergens meer in app-code — bewijs: `grep -rn 'isCountdown\|paceZone\|pulseAnim' app/ components/ lib/` → nul treffers buiten `components/PaceZone.tsx` zelf; `tsc --noEmit` exit 0
- [x] F18 — KPI.tsx, SectionHeader.tsx en SplitsList.tsx zijn weg, inclusief stories en barrel-regels — bewijs: `git status` toont zes `D`-regels; `render:sweep` telt 246 stories over 51 componenten tegen 257 over 54 ervoor
- [ ] F18 — de drie Figma-pagina's zijn weg en `figma:check` is groen op de as `pagina` — OPEN: `figma:check` staat op `FAIL [pagina] Figma-pagina zonder component: SectionHeader, SplitsList, KPI`. Vraagt de RowTrack-library open in Figma Desktop
- [x] States n.v.t. voor F15/F16/F19 — geen nieuwe data-laag; de loading-state van de BPM-rij bestaat al en blijft ongewijzigd — bewijs: `KpiRow` houdt `loading` ongewijzigd (diff raakt alleen de kleurrol van de waarde), en `ActivePhase/Hartslag Zoeken` toont nog steeds de spinner
- [ ] Interactie: tik (F15) en Android-back (F16). De tik is aangedreven — de `play` van de drie `Met Fout`-stories drukt een react-native-web-knop echt in en het scherm reageert. Android-back is `[NIET TE VERIFIËREN — geen Android-toestel of -emulator in dit verify-pad; `## Verify-pad` noemt alleen iOS-sim en een fysieke iPhone]`
- [x] Edge case: portrait én landscape tonen de F15-affordance gelijk — bewijs: beide layouts roepen dezelfde `renderKpiList()` aan (`ActivePhase.tsx:350` portrait, `:413` landscape) en de affordance zit in `KpiRow` zelf, niet in een layout. Gemeten in portrait; de landscape-story heeft een verbonden band, dus daar is de band-loze kant niet apart gemeten
- [x] Geen rauwe kleur of maat toegevoegd — bewijs: `pnpm --filter @umanex/tokens guard` exit 0, '246 bestanden schoon (0 baseline-uitzonderingen)'; `figma:check` as `[hardcoded]` groen over 44 stories
- [ ] De beeld-basislijn is opnieuw gemeten op darwin én linux na de zichtbare wijzigingen — darwin staat (24 frames, twee emmers), linux wacht op een CI-run ná de Figma-ronde; de Figma-export van de gewijzigde frames bestaat nog niet

## Beslissingsgeschiedenis

- 2026-09-14: F14 verworpen (Jeroen). De vier labels passen niet naast elkaar op 430px,
  de gelijk-brede-segmentenvariant was eerder al afgewezen, en VoiceOver leest de
  betekenis al voor via `accessibilityLabel`. Reden gaat naar BACKLOG.md.
- 2026-09-14: F18 in volle omvang (Jeroen) — inclusief de drie Figma-pagina's, niet
  alleen de dode props.
