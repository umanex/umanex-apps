# soda-plus — projectcontext

Designopdracht voor de sollicitatie bij **soda+**. Next.js (App Router), dev op poort 3004.

Dit bestand is bewust **minimaal**: het bevat alleen wat vaststaat. Vul aan naarmate de
opdracht duidelijk wordt — verzonnen projectcontext is schadelijker dan geen.

## Wat vaststaat

- **De bron is `Voorbeeld SODA-rapport.pdf` — één pagina, KTA Brugge, klas OKANOR.** Het is géén
  blanco sjabloon: DW1, DW2 en DW3 dragen scores (S=B · O=B · D=A · A=A/B/B) én klassenraadfeedback,
  in twee verschillende notatiestijlen. Het vak "Oplossing voor de B-scores volgens de leerling" is
  in alle drie leeg. **DW4 is de periode die nog moet volgen** en staat daarom aan béide kanten leeg
  — dat is het controlegeval dat de leegte in DW1–DW3 betekenis geeft, en het is geen tekortkoming.
  De demo-data op het board komt hiervandaan: scherm 00 toont P1 en P2 = DW1 en DW2, en de citaten
  op 05 en 10 staan letterlijk in DW2 en DW3. Wat het rapport níet zegt: of dit typisch is, en wat
  er op de achterkant staat (het sterretje verwijst ernaar) — allebei vragen voor SODAplus.
  Het document zelf zit niet in de repo; vraag het op vóór je er iets over beweert.
  Zie `LEARNINGS.md` in umanex-os, entry 2026-09-02.
- De app heet `soda-plus` op schijf en in git (`feat(soda-plus): ...`); `soda+` is de merknaam.
- Werk in de hoofdtree, `apps/soda-plus`, op een feature branch vanaf `origin/main`; de vroegere eigen zusmap-worktree is op 2026-08-25 geschrapt (`.umanex-os/CLAUDE.md` → Git workflow → Parallel werk).
- Stack conform monorepo-default: Next.js 14 + Tailwind 3, rollaag via `@umanex/config/tailwind/preset`,
  `@umanex/ui` en `@umanex/tokens` als workspace-deps. Geen DB, geen auth, geen mail.

## Wat nog open staat

- De opdracht zelf — inhoud van de brief van soda+. Zonder die brief geen TC-EBC en dus geen schermwerk.
- Merk-context: type-stack, kleur, tone of voice. `app/layout.tsx` draait nu op de
  fallback-fontstack; het next/font-blok komt er zodra de huisstijl vaststaat.
- Deliverable-vorm: is dit een klikbaar prototype, een casepresentatie, of allebei?

## Verify-pad

**Code:** geen. `pnpm --filter soda-plus type-check` en `build` draaien; er is nog geen flow-harness
(`scripts/flow-harness.mjs`) zoals bij portfolio en jobradar. Dat is een gat, geen vergetelheid —
bouw hem wanneer er schermen in code staan. Vandaag leeft de deliverable in Figma, niet in `app/`.

**Board (Figma `XwEUhY92XX32sQkEIdbEFN`, pagina "Wireframes"):** de meetbare as loopt via de
Desktop Bridge, nooit via REST — een REST-render is na een edit per definitie stale.

| Capability | Commando |
|---|---|
| Bridge leeft | `figma_get_status` met `probe: true` (verwacht `probeResult.success`) |
| Render vastleggen | `figma_capture_screenshot` met `nodeId` — runtime-klasse, dus vers |
| Contrast | `figma_execute`: tel zichtbare TEXT-nodes per fill-hex. `#9e9e9e` = 2,68:1 op wit en mag niet voorkomen; `#6b6b6b` = 5,33:1 op wit en 4,85:1 op `#f4f4f4` |
| Tekstgrootte | `figma_execute`: tel `fontSize < 12`. Let op `textAutoResize === 'NONE'` — zo'n vaste box knipt stil af zónder uitloop te tonen |
| Uitloop | tekstbreedte tegen **`parent.width - paddingLeft - paddingRight`**, niet tegen de framebreedte. Twee afknottingen op 2026-09-02 stonden groen omdat ik tegen 375 px mat in plaats van tegen de cel (96) en de kaart (305) |
| Overlap | frames paginabreed paarsgewijs, én tekstnodes onderling binnen 40 px op y |
| Prototype | `figma.currentPage.findAll(n => n.reactions.length)` + `flowStartingPoints`; NAVIGATE naar het eigen frame wordt geweigerd |
| Sectie-integriteit | elk frame binnen zijn sectie, secties onderling niet overlappend op y |

De acceptatielijst van de lopende briefing is de bron; vink af met de meting in de regel.
