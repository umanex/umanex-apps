# TC-EBC — Splits-tabel kolomheader buiten de tabel

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gevalideerd

---

```
TASK:        Verplaats de kolomlabels SPLIT & WATT van binnen de splits-tabel naar
             buiten de tabel (boven de card), consistent met de andere tab-schermen.
CONTEXT:     Historiek → workout-detail → tab "Splits". Nu staan SPLIT/WATT als eerste
             rij binnen de tabel-card; de andere tabs zetten kolomheaders buiten de card.
ELEMENTS:    Splits-tabel-card, kolomlabel-rij (SPLIT / WATT), afstand-rij-labels (500M…),
             per-rij waarden (split-tijd, watt).
BEHAVIOUR:   Statisch — header-labels zijn geen interactie. Kolomuitlijning moet exact
             boven de rij-waarden vallen, ongeacht aantal rijen.
CONSTRAINTS: React Native / Expo, RowTrack-tokens (geen umanex-DNA). Dark mode.
             Figma node 38-5009 is de bron van waarheid voor de header-positie.
```

Figma: [Splits-detail 38-5009](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=38-5009&t=q8oCmCXGSXuJOVTE-4)

---

## Open vragen

_(geen — layout-fix met duidelijke Figma-referentie en "match de andere tabs")_

## Aannames

- [ASSUMPTION: header-label-typografie/kleur = dezelfde token als de bestaande kolomheaders op de andere tabs; overnemen uit Figma, niet los kiezen]
- [ASSUMPTION: de linkerkolom (afstand-labels) krijgt geen header-label, net als nu]

## Acceptatie

- [x] SPLIT- en WATT-labels staan buiten/boven de tabel-card (niet als eerste tabelrij)
- [x] Kolomuitlijning van de labels valt exact boven de bijhorende rij-waarden
- [x] Typografie, kleur en spacing matchen Figma node 38-5009
- [x] Waarden komen uit tokens (geen hardcoded kleur/spacing/size)
- [x] Consistent met de header-aanpak op de andere tabs (Overzicht/Hartslag)
- [x] Dark mode correct

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — kolomheader SPLIT/WATT van binnen naar buiten de tabel.
