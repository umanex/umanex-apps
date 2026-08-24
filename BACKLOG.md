# BACKLOG.md — gemeld, niet gebouwd

Dit bestand vangt het werk dat **buiten scope** viel: wat er benoemd is maar niet gedaan, plus de P3-bevindingen uit `ux-audit` en `security-audit`. Zonder deze lijst is "buiten scope gelaten" alleen een zin in een antwoord dat wegscrollt — de melding bestaat dan wel, het werk niet, en niemand kan er later op terugkomen.

Entries komen erbij **op het moment van de melding**, niet aan het einde van de sessie. Een sessie die zonder reflectie afloopt mag geen scope-drop verliezen; dat is precies de vorm waarin ze vandaag verdwijnen.

## Waarom dit geen HANDOFF is

Een handoff-item is **sessie-gebonden**: het zorgt dat de volgende sessie niet koud begint en verdwijnt zodra het opgepakt is. Een backlog-item is **werk** — het blijft bestaan tot het gebouwd of bewust verworpen is, ook als er tien sessies overheen gaan. Ze in één bestand gooien maakt het sessiestart-signaal onbruikbaar: de handoff-lijst hoort kort te zijn, een backlog mag lang worden.

| Soort bevinding | Huis |
|---|---|
| Werk dat benoemd is maar niet gebouwd (scope-drop) | **hier** |
| P3 / nice-to-have uit `ux-audit` of `security-audit` | **hier** |
| Waargenomen fout van een skill of werkprincipe | `LEARNINGS.md` (via `vastleggen`) |
| Onzekerheid, aanname, risico, next-step van déze sessie | `HANDOFF.md` (via `sessie-reflectie`) |
| Durend feit over Jeroen of het project | auto-memory |

## Statussen

- `open` — vastgelegd, nog geen beslissing over genomen. Telt mee bij sessiestart.
- `gepland` — dit gebeurt; het wacht op een plek in de planning.
- `gebouwd` — gedaan. Blijft staan als spoor, met commit of PR erbij.
- `verworpen` — bewust niet doen. **Reden verplicht**, anders komt hetzelfde voorstel over drie maanden terug en begint de afweging van nul.

## Types

`feature` · `refactor` · `fix` · `test` · `infra` · `ux` · `security` · `docs`

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

    ## YYYY-MM-DD — {korte titel} · [{type}]
    - **Wat:** {1-2 zinnen — wat er gebouwd zou worden}
    - **Waarom niet nu:** {waarom het buiten scope viel}
    - **Eerste zet:** {concreet startpunt of "-"}
    - **Status:** open

<!-- De eerste entry maakt hieronder de juiste laag-header aan. -->

# Globaal

## 2026-08-24 — umanex-profile voert nog "Design Team Of One" · [docs]
- **Wat:** `.umanex-os/profiles/umanex.md` beschrijft de positionering als *"Design Team Of One"* en de AI-aanpak als *"evolutie van DToO"*. De portfoliosite laat die belofte sinds vandaag los: het bureau-plan stelt dat freelancers structureel zijn vanaf de eerste retainer, dus één-persoon-zijn is geen belofte meer maar een tegenspraak. Het profile bijwerken naar de koper-positionering (meer producten dan designers, capaciteit in dagen) sluit de drift.
- **Waarom niet nu:** het profile is de klant-laag die élke sessie in élke app stuurt, ook buiten portfolio. De site herschrijven was gevraagd; het merkprofiel herschrijven niet. Stil meeveranderen zou een positioneringsbeslissing verstoppen in een portfolio-PR.
- **Eerste zet:** in `profiles/umanex.md` de sectie *Positionering* en *Toekomst* naast `apps/portfolio/lib/copy.ts` leggen en beslissen of DToO helemaal weg moet of blijft staan als historiek. `apps/portfolio/briefings/2026-08-24-feature-bureau-positionering.tcebc.md` heeft de argumentatie.
- **Beslist:** DToO gaat weg als positionering en blijft als één historiek-alinea staan — oudere audits en briefings dragen de term nog, en zonder die noot kan een volgende sessie een vervallen lijn niet van een huidige onderscheiden. De doelgroep is meteen mee vernauwd en de drie naamregels uit het marktonderzoek staan nu in het profiel in plaats van alleen in de portfolio-briefing.
- **Status:** gebouwd — PR #302
