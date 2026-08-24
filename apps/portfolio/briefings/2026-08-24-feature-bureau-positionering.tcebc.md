# TC-EBC — Bureau-positionering portfolio

**Datum:** 2026-08-24
**Type:** feature
**Project:** portfolio (`apps/portfolio`)
**Klant:** umanex (eigen werk)
**Status:** gevalideerd

---

```
TASK:        Zet de portfoliosite om van persoonlijk portfolio voor hiring-beslissers naar
             voordeur van het bureau: hij verkoopt de scan en de maandelijkse designcapaciteit.

CONTEXT:     Bron is het bureau-plan "umanex 2027" (Artifact 0d79a364-bbcd-4880-8829-1d254d92bb78,
             24 aug 2026). De site is in juni gebouwd voor hiring-beslissers; het plan richt zich
             op een koper: CTO, oprichter of head of product bij een productbedrijf van 20–100
             mensen met meer softwarepakketten dan designers. Dat is een andere lezer, dus de
             herschrijving gaat over de hele voorkant. De cijferkant van het plan (omzetlijnen,
             marge per dag, freelancekost, saldo, stopregels) is interne besluitvorming en komt
             NIET op de site.

ELEMENTS:    Nieuwe route /aanbod — doelgroep-toets, de ladder scan → traject → capaciteit, drie
             capaciteitstredes in dagen, contractvoorwaarden, het projectanker.
             Nieuwe route /scan — wat het is, het meetpunt dat het oplevert, prijs, verloop.
             Herschreven op /: Hero, KeyMessages, ContactSection.
             Header-nav: Aanbod erbij, Carrière eruit (verhuist naar de footer).
             Werkwijze: brug naar /aanbod. Footer: Carrière-link. Metadata per route.

BEHAVIOUR:   Klik en keyboard, geen andere modaliteit. Elke sectie eindigt op één weg vooruit:
             home → /aanbod → /scan → mail. /scan staat bewust niet in de nav — het is de pagina
             die Jeroen persoonlijk doorstuurt. Reveal bij scroll, zoals elders in de app
             (framer-motion, bestaand patroon, respecteert prefers-reduced-motion).

CONSTRAINTS: Nederlands, je-vorm, umanex-stem — direct, vakman, geen marketing-fluff, geen
             zelfondermijning. Uitsluitend rollen uit de tokens-preset; geen hex, geen rauwe
             paletklasse, geen arbitrary size. Light én dark. Geen data-laag in deze app, dus
             geen loading/empty/error. Prijs: alleen de scan (€3.500) staat er; capaciteit
             uitsluitend in dagen per maand.
```

---

## Prijs- en taaldiscipline (uit het plan, hard)

Deze vier zijn geen stijlvoorkeur maar bevindingen uit het marktonderzoek in het plan. Ze gelden
voor élke regel copy op /aanbod en /scan:

1. **Nooit "design abonnement" of "design retainer" in het Nederlands.** Die categorie zit in
   België op €249–1.295 per maand. Wie het woord gebruikt, verdedigt daarna een factor zes.
   Gebruik: capaciteit, dagen, design-system-programma.
2. **Het aantal dagen staat in het contract.** Onbeperkte-verzoeken-modellen bestaan alleen
   onder €1.500/maand. De site mag dus nergens onbeperkte inzet suggereren.
3. **Dagen vervallen per maand, maximaal één maand doorrol.** Staat expliciet op /aanbod, want
   het is een voorwaarde die de koper vóór het gesprek moet kennen.
4. **Nooit "goedkoper dan een aanwerving".** Falsifieerbaar aan tafel: een Belgische UX designer
   kost €4.600–4.900 per maand aan werkgeverskost en de kernredes liggen daarboven. Het anker is
   het projectbudget (design system in België ≈ €60.000, vooraf getekend), niet de loonlijst.

## Wat expliciet niet op de site komt

Omzetlijnen, marge per eigen dag, freelancekost, banksaldo, de stopregels, de Luminus-verhouding,
de fasering per kwartaal. Dat is intern. De site draagt alleen de positionering, de doelgroep,
het aanbod en het argument eronder.

## Open vragen

- Geen. De drie beslissingen die de vorm bepaalden zijn genomen op 2026-08-24: koper voorop,
  alleen de scan met bedrag, en /aanbod + /scan als aparte routes.

## Aannames

- `[ASSUMPTION]` De scan kost één rond bedrag van €3.500 en vraagt ongeveer twee dagen werk —
  afgeleid uit de plan-lijn "drie betaalde scans, €10.500, 5 eigen dagen".
- `[ASSUMPTION]` Het meetpunt van de scan wordt gepresenteerd als een keuze uit twee (doorlooptijd
  van beslissing tot gepubliceerde geverifieerde UI, óf het aantal drifts tussen producten). Het
  plan noemt beide als voorbeeld en kiest er geen.
- `[ASSUMPTION]` De klantnamen Adhese, Luminus en Columba blijven vermeld — goedgekeurd op
  2026-06-10, niets in het plan trekt dat terug.
- `[ASSUMPTION]` "Design Team Of One" verdwijnt als belofte op de koper-pagina's. Het plan stelt
  dat freelancers structureel zijn vanaf retainer nummer één; de oude tagline zou dan een
  belofte zijn die het model tegenspreekt. Dit wijkt af van `.umanex-os/profiles/umanex.md`, dat
  DToO nog als positionering voert — die drift staat in `BACKLOG.md`, niet stilzwijgend gefixt.

## Acceptatie

Afgevinkt op bewijs uit één run van `pnpm --filter portfolio flow` op een verse build (2026-08-24),
plus metingen op de geprerenderde HTML in `.next/server/app/`.

- [x] `/aanbod` en `/scan` laden met status < 400 en meer dan 20 tekens tekst — 200 met 4064 resp. 2055 tekens
- [x] Console schoon op alle zes routes, geen verzoek buiten de eigen origin — beide groen in dezelfde run
- [x] Geen horizontale overflow op 375 px op elke route — 6/6 groen ná de header-fix; de tegenproef in `--selftest` gaat af op een opgewekt defect van 1625 px
- [x] Hoofdnav telt vier items plus de thema-toggle; Carrière staat er niet meer in maar wél in de footer — gemeten op de gerenderde `index.html`: nav = Aanbod · Cases · Werkwijze · Contact + 1 knop; footer = Aanbod · De scan · Cases · Werkwijze · Carrière
- [x] De H1 op `/` is de belofte, niet de eigennaam — `"Meer producten dan designers."`, geen "Jeroen" of "Colpaert" in enige H1
- [x] Het enige umanex-bedrag is €3.500 (`/scan` en de scan-trede op `/aanbod`); de enige andere bedragen zijn de marktreferenties €60.000 en €15.000 op `/aanbod` — gemeten op de **gerenderde** tekst, niet op de broncode
- [x] De woorden "abonnement" en "retainer" komen nergens in de gerenderde copy voor
- [x] Geen aanwervings-vergelijking in de copy — geen treffer op `aanwerv|in dienst|loonkost|werkgeverskost|salaris`
- [x] Geen enkel cijfer uit de interne cijferkant (233.550 · 132.000 · 162.000 · 1.139 · 572 · 7.787 · 6.261 · 10.246)
- [x] Geen hex, geen rauwe paletklasse, geen arbitrary size — leeg over `app/`, `components/`, `lib/`, met positieve controle: hetzelfde patroon vindt wél de bekende kale hex in `apps/cashflow/scripts/render-charts.tsx:149`. `pnpm --filter @umanex/tokens guard`: 189 bestanden schoon
- [x] Light én dark gerenderd, beide leesbaar — `--shot` en `--shot --dark`, met een assertie dat de `dark`-class in de dark-run daadwerkelijk gezet is
- [x] `pnpm --filter portfolio type-check` en `next build` slagen — beide exit 0, `next lint` zonder waarschuwingen

**Meetnotitie.** De drie copy-regels stonden eerst als `grep` over `lib/` en `app/`. Dat mat het
verkeerde bereik: `lib/copy.ts` draagt een commentaarblok dat de verboden woorden en de €249-band
zélf noemt, dus het instrument vond zijn eigen uitleg terug. De meting is verplaatst naar de
geprerenderde HTML, met een positieve controle die aantoont dat de extractie tekst oplevert.

**Bevinding tijdens de run, opgelost.** De smal-scherm-check ging bij zijn eerste run rood op
**alle zes** routes met exact dezelfde 38 px — ook op de vier pagina's die niet gewijzigd waren.
Gemeten in de browser: de header-nav was 328 px breed in een venster dat er 264 vrijliet, dus de
thema-toggle viel buiten beeld en de hele pagina scrollde horizontaal. Met de oude vier
nav-labels was dat 40 px, dus het defect bestond al vóór dit werk en het extra Aanbod-item maakte
het zelfs 2 px kleiner. Opgelost door de nav onder `sm` te laten krimpen (`px-1.5 text-xs`).

## Beslissingsgeschiedenis

- 2026-08-24: doelgroep gekanteld van hiring-beslisser naar koper van designcapaciteit. Gevolg voor de vorm: de H1 op `/` wordt de belofte in plaats van de eigennaam, en Carrière zakt uit de hoofdnav naar de footer.
- 2026-08-24: prijzen deels publiek. Alleen de scan krijgt een bedrag; de drie capaciteitstredes staan in dagen per maand. Reden: geen enkel Belgisch bureau publiceert een maandprijs voor capaciteit, en de koper ankert op marketingretainers van €1.000–3.000.
- 2026-08-24: `/scan` wordt een eigen route in plaats van een sectie op `/aanbod`, omdat het de pagina is die persoonlijk doorgestuurd wordt en dus zelfstandig moet staan.
- 2026-08-24: de flow-harness kreeg er drie meetassen bij (smal scherm, dark mode, doorzichtigheid na het doorrollen), elk met een eigen tegenproef in `--selftest`. Zonder de eerste was de header-overflow onzichtbaar gebleven; zonder de derde was elke render-screenshot van deze app een grotendeels leeg beeld.
- 2026-08-24: "Design Team Of One" verdwijnt van de koper-pagina's. Vervangt de richting uit `todos/2026-06-16-todo-portfolio-herpositionering.md`, die de tagline nog wilde behouden.
