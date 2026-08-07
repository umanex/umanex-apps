# Herhaal vorige maand

- **Datum:** 2026-08-04
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Eén actie neemt de posten van de vorige maand over in een maand, met een
             afvinkbare voorbeeldlijst vóór het overnemen.

CONTEXT:     Fase 2 van 2026-08-04-plan-advies-implementatie.md, eerste helft. Beide
             adviesrapporten noemen data-invoer de grootste faalfactor van handmatige
             cashflow-tools; vandaag voeg je elke post één voor één toe.

ELEMENTS:    Trigger per maandkolom, overlay met een lijst van kopieerbare posten
             (omschrijving · bedrag · checkbox), een regel die al bestaande posten
             markeert, bevestigknop met aantal.

BEHAVIOUR:   Klik opent de lijst met alles aangevinkt. Afvinken wat niet mee moet;
             bevestigen maakt de posten aan in de doelmaand. Een post die er al lijkt
             te staan wordt gemarkeerd en standaard uitgevinkt.

CONSTRAINTS: Alleen inkomsten en eenmalige uitgaven — vaste uitgaven en spaarpotten
             verschijnen al vanzelf in elke maand. Bedragen worden overgenomen, de
             betaald/ontvangen-vlag niet: een gekopieerde post staat altijd open.
```

---

## Open vragen

Alle drie beantwoord op 2026-08-04:

1. **Component-typologie** — modal, zoals `ReservationPaymentModal`.
2. **Bronmaand** — telkens de maand ervóór, dus elke kolom neemt over van zijn eigen
   voorganger. De knop noemt de bronmaand in zijn tooltip.
3. **Duplicaten** — tonen, gemarkeerd met "(staat er al)" en standaard uitgevinkt. Match op
   genormaliseerde omschrijving (trim + kleine letters), per categorie apart.

## Aannames

- `[ASSUMPTION]` De trigger staat in de maandheader, niet per sectie: het gaat om één
  actie die beide categorieën tegelijk overneemt.
- `[ASSUMPTION]` Alleen `incomeItems` en `expenseItems` worden gekopieerd. Vaste uitgaven
  (`recurringItems`) en spaarpotten gelden al voor elke maand, dus kopiëren zou dubbel
  tellen.
- `[ASSUMPTION]` De betaald/ontvangen-vlag gaat niet mee — je kopieert een verwachting,
  geen afgehandelde betaling.
- `[ASSUMPTION]` De bronmaand mag buiten het zichtbare venster liggen; de posten staan in
  de store met hun eigen `monthKey`, dus dat is beschikbaar.
- `[ASSUMPTION]` Geen loading- of error-state: alles gebeurt lokaal en synchroon. Wel een
  lege staat wanneer de bronmaand niets bevat.

## Acceptatie

- [x] De actie is bereikbaar vanuit elke maandkolom — drie knoppen, elk met zijn eigen
      bronmaand in de tooltip.
- [x] De lijst toont de inkomsten en eenmalige uitgaven van de bronmaand met hun bedrag,
      met teken en kleur per richting.
- [x] Alles staat standaard aangevinkt, behalve wat al in de doelmaand lijkt te staan.
- [x] Bevestigen maakt exact de aangevinkte posten aan, in de juiste maand, als openstaand.
- [x] De bevestigknop toont hoeveel posten er overgenomen worden en is uitgeschakeld bij nul.
- [x] Een bronmaand zonder posten toont een lege staat die uitlegt waarom de lijst leeg is.
- [x] Annuleren of sluiten laat de store ongemoeid — er wordt pas geschreven bij bevestigen.
- [x] Het eindsaldo van de doelmaand verandert met de som van de overgenomen posten: de
      modal voegt gewone inkomsten en uitgaven toe, die de calculator al meerekent. De
      modal toont dat saldo-effect vooraf.
- [x] `buffer-scenarios.ts` groen (145/145); de calculator is niet geraakt.
- [x] Visueel gevalideerd op 2026-08-04: de modal opent met bron- en doelmaand in de kop,
      toont beide posten aangevinkt met hun teken, en meldt het saldo-effect. Overnemen
      voegde ze toe aan de doelmaand en het beschikbaar saldo verschoof met exact het
      voorspelde bedrag (€ 1.429,50 → € 2.079,00, verschil € 649,50).

## Beslissingsgeschiedenis

- 2026-08-04: aangemaakt als eerste helft van fase 2.
- 2026-08-07: de tweede helft — een CSV-import zodra het bankformaat bekend was — is
  definitief geschrapt. "Herhaal vorige maand" is daarmee het volledige antwoord op de
  invoerfrictie uit WS3.
