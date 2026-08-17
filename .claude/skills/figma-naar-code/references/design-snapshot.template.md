# Design-snapshot — <ComponentNaam>

<!-- Gegenereerd tijdens figma-naar-code stap 4b. Beschrijft de DESIGN-INTENTIE (wat Figma zegt),
     niet de gebouwde output. Beoordeel/verify dift de code hiertegen. Bijwerken zodra de mapping wijzigt. -->

- **Node-id**: `<X:Y>`
- **Figma-URL**: <https://www.figma.com/design/…?node-id=X-Y>
- **Datum**: <YYYY-MM-DD>

## Token-bindings

| Property     | Figma-pad     | Token-pad              | Laag       |
| ------------ | ------------- | ---------------------- | ---------- |
| fill (bg)    | color/…       | color.background.…     | semantisch |
| text         | color/…       | color.text.…           | semantisch |
| border       | color/…       | color.border.…         | semantisch |
| radius       | radius/…      | radius.…               | primitief  |
| padding      | spacing/…     | spacing.…              | primitief  |
| gap          | spacing/…     | spacing.…              | primitief  |

## Structuur

- **Layout**: <horizontaal / verticaal> auto-layout
- **Sizing**: <fill / hug> per as
- **Gap / padding**: <token-paden>

## States

<!-- Afgeleid uit Figma `reactions` (stap 5). Geen speculatieve states. -->

- default
- hover — <token-delta, of "—">
- focus — <token-delta, of "—">
- (geen `reactions` in Figma → noteer expliciet: "geen interactie-states")

## Open punten

- [ ] <ontbrekend token / TODO-voorstel, of "geen">
