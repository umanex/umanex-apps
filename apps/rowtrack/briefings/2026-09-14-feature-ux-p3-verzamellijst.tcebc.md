# TC-EBC — UX-audit P3-verzamellijst (F13–F19)

- **Datum:** 2026-09-14
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gepland

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

- [ ] F13 — gesloten op meting, niet op herinnering: `backLink` is 'HISTORIEK', niet 'OVERZICHT'
- [ ] F17 — gesloten op meting: de doelloze KPI-lijst bevat geen AFSTAND
- [ ] F14 — verworpen mét reden in BACKLOG.md, en de reden noemt de breedte én het a11y-label
- [ ] F15 — de BPM-rij toont zijn affordance uitsluitend wanneer `onPress` actief is
- [ ] F15 — de affordance verdwijnt zodra de rij `disabled` is (band verbonden, scan loopt, wachtend)
- [ ] F16 — de samenvatting-Modal draagt `onRequestClose` en die roept dezelfde handler als "Ga verder"
- [ ] F16 — HealthConsentScreen blijft zonder `onRequestClose`, met de reden in de code
- [ ] F19 — de legenderegel staat er alleen wanneer het sterretje er staat (geen profielgewicht)
- [ ] F19 — de legenderegel staat er niet wanneer er wél een profielgewicht is
- [ ] F18 — `paceZone`, `isCountdown` en `pulseAnim` bestaan nergens meer in app-code
- [ ] F18 — KPI.tsx, SectionHeader.tsx en SplitsList.tsx zijn weg, inclusief stories en barrel-regels
- [ ] F18 — de drie Figma-pagina's zijn weg en `figma:check` is groen op de as `pagina`
- [ ] States n.v.t. voor F15/F16/F19 — geen nieuwe data-laag; de loading-state van de BPM-rij bestaat al en blijft ongewijzigd
- [ ] Interactie: tik (F15) en Android-back (F16) — beide op het toestel of in de harness aangedreven, niet uit de code afgeleid
- [ ] Edge case: portrait én landscape tonen de F15-affordance gelijk
- [ ] Geen rauwe kleur of maat toegevoegd — `pnpm --filter @umanex/tokens guard` groen
- [ ] De beeld-basislijn is opnieuw gemeten op darwin én linux na de zichtbare wijzigingen

## Beslissingsgeschiedenis

- 2026-09-14: F14 verworpen (Jeroen). De vier labels passen niet naast elkaar op 430px,
  de gelijk-brede-segmentenvariant was eerder al afgewezen, en VoiceOver leest de
  betekenis al voor via `accessibilityLabel`. Reden gaat naar BACKLOG.md.
- 2026-09-14: F18 in volle omvang (Jeroen) — inclusief de drie Figma-pagina's, niet
  alleen de dode props.
