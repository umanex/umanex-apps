# Profile-parity + geboortedatum-wheel restyle

**Datum:** 2026-07-14
**Type:** screen
**Project:** rowtrack
**Klant:** umanex
**Status:** gepland

---

```
TASK:        Volledige design-parity van de Profile-sectie tegen het bijgewerkte Figma-design +
             de geboortedatum-wheelpicker de styling/layout van de doel-wheel laten erven.
CONTEXT:     apps/rowtrack — Profile-scherm (app/(tabs)/profile.tsx) + BottomSheet-sheets + WheelPicker.
             Figma Profile-set net bijgewerkt. Volgt op PR #121 + audit-re-triage WS1.
ELEMENTS:    ProfileScreen (ACCOUNT / LICHAAMSGEGEVENS / ROEITRAINER / MIJN DOEL), listRow + chevron,
             BottomSheet, segmented control (Geslacht + Doel), stepper (Lengte/Gewicht),
             WheelPicker (doel + geboortedatum), sheet-inputs, Button.
BEHAVIOUR:   tap rij → sheet; wheel scroll + snap + fade; stepper +/−; segmented select; opslaan/annuleren.
             Geboortedatum-wheel: dag/maand/jaar mét de doel-wheel-look (pill + opacity-fade + rijhoogtes).
CONSTRAINTS: React Native/Expo · StyleSheet · tokens uit @/constants (geen off-token hardcodes) · Ionicons ·
             portrait · dark. Figma Console MCP (Desktop Bridge) primair. Delta = TBD uit Figma-read.
```

---

## Open vragen

- Exacte Figma-delta per element (parity-read levert dit op — nog te bepalen vóór implementatie).
- Blijft de geboortedatum-wheel 3 losse kolommen (dag/maand/jaar), of één samengestelde wheel? (aanname: 3 kolommen, elk met de doel-wheel-rij-look).

## Aannames

- [ASSUMPTION] States loading/empty/error blijven zoals nu (WS4-beslissing: code wint, geen strip).
- [ASSUMPTION] Chevron blijft Ionicons (projectconventie) tenzij het bijgewerkte design expliciet anders dwingt.
- [ASSUMPTION] Off-token design-waarden worden in Figma getokeniseerd, niet als hex in code gehardcode.

## Acceptatie

- [ ] Desktop Bridge actief + Profile-frames gelezen (`figma_get_status` → `get_metadata`/`get_screenshot`).
- [ ] Parity-delta per element vastgelegd (lijst-rijen, sheets, segmented, stepper, inputs) tegen de code.
- [ ] Segmented control matcht design (vorm/radius/padding/hoogte) via tokens.
- [ ] Stepper matcht design (maat/radius/waardevak) via tokens.
- [ ] Geboortedatum-wheel erft de doel-wheel-styling: pill, opacity-fade, rijhoogtes, centrering.
- [ ] Alle waarden via `@/constants` tokens — geen off-token hardcodes (ontbrekende tokens → gemeld, niet gehardcode).
- [ ] States loading/empty/error ongewijzigd aanwezig.
- [ ] typecheck groen; verify op render-pad (sim + waar relevant toestel).

## Beslissingsgeschiedenis

- 2026-07-14: Aangemaakt. Vervangt de "snap vs exact token"-vraag voor segment/stepper — Jeroen werkte het Figma-design bij en vraagt een volledige parity-implementatie i.p.v. losse alignments.
