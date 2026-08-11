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

# Project — rowtrack-web

## 2026-08-11 — Hero-kop breekt na "telt." op desktop · [ux]
- **Wat:** De slogan "Elke haal telt." op één regel houden in de hero op brede viewports; nu breekt `text-balance` na "telt." (P3 uit de ux-audit van het premium redesign).
- **Waarom niet nu:** Kop-tuning raakt copy-balans en wordt beter één keer gedaan zodra de EN-locale erbij komt.
- **Eerste zet:** `max-w`-tuning op de h1-kolom in `apps/rowtrack-web/components/sections/Hero.tsx` en op beide locales nameten.
- **Status:** open

## 2026-08-11 — Metrics-grid laat een leeg slot rechtsonder · [ux]
- **Wat:** De 7 metric-kaarten in een 4-koloms grid eindigen op 4+3 met een leeg vierde slot (P2/P3-grens uit de ux-audit). Opties: laatste kaart laten spannen, terug naar 3 kolommen, of de rij bewust zo laten.
- **Waarom niet nu:** Een achtste kaart verzinnen mag niet (waarheidstabel); de overige opties zijn smaak en verdienen een blik van Jeroen in plaats van een stille keuze.
- **Eerste zet:** Twee varianten naast elkaar renderen (`col-span`-variant vs. 3-koloms) en kiezen.
- **Status:** gebouwd — Jeroen koos 2026-08-11 zelf voor een achtste kaart; SLAGEN (FTMS-totaal, in de waarheidstabel) vult het slot als 4+4-grid, expliciet geformuleerd als totaal-na-afloop. Zit in PR #274.
