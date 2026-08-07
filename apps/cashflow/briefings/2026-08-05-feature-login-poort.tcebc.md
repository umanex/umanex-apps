# Loginpoort

- **Datum:** 2026-08-05
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gevalideerd (2026-08-07) — zie Acceptatie voor het bewijs per item

---

```
TASK:        Sessiepoort voor de hele app — zonder login geen cashflowdata.
CONTEXT:     Volgt uit "Supabase is de enige bron". RLS staat op user_id = auth.uid(),
             dus zonder sessie geeft de database niets terug. Raakt / en /analyse.
ELEMENTS:    Loginformulier (e-mail, wachtwoord, knop), foutmelding, sessie-skelet,
             uitlogknop in de header.
BEHAVIOUR:   Bij laden wordt de sessie gecontroleerd → skelet. Geen sessie → formulier
             in plaats van de prognose. Sessie → app zoals nu. Inloggen faalt → melding
             onder het veld, formulier blijft ingevuld. Uitloggen → terug naar formulier.
CONSTRAINTS: Desktop-web, bestaande umanex-tokens, geen nieuwe UI-dependency.
             Eén gebruiker: geen registratie in de app, account komt uit het dashboard.
```

---

## Open vragen

Geen.

## Beslist

- **Component-typologie** — inline poort in `app/layout.tsx`. Geen `/login`-route, dus geen
  redirect-afhandeling en geen terugkeer-na-login voor twee routes en één gebruiker.
- **Bestaande data** — eenmalig seed-script uit `cashflow-store-v3_2026-08-05_arc.json`.
  Geen import-UI: die zou in Chrome de verkeerde store aanbieden, en bij puur remote leest
  de app localStorage sowieso niet meer.
- **Wachtwoord-reset** — buiten scope. Wachtwoord staat in de password manager; kwijt is
  resetten via het Supabase-dashboard.

## Aannames

- `[ASSUMPTION: interactie-modaliteit]` Standaard formuliergedrag — klik en toetsenbord,
  Enter verstuurt, autofocus op het e-mailveld, browser-autofill werkt.
- `[ASSUMPTION: states]` Loading (sessiecontrole én tijdens inloggen) en error zijn
  aanwezig. Empty valt af: een loginformulier heeft geen lege staat. Success is de app
  zelf, geen apart scherm.
- `[ASSUMPTION: edge cases]` Afgevangen: foute credentials, verlopen of ingetrokken sessie
  tijdens gebruik, netwerk weg, en de dubbele-submit tijdens een lopende poging.
- `[ASSUMPTION: device]` Desktop-web, zoals de rest van de app (drie maandkolommen naast
  elkaar in een vaste grid).
- `[ASSUMPTION: design system]` Bestaande tokens en de knopstijl uit de huidige header —
  geen nieuwe primitives.

## Acceptatie

Nagelopen op 2026-08-07 tegen de code. Deze poort is dagelijks in gebruik sinds 08-05, dus
de hoofdpaden (inloggen, herladen, uitloggen) zijn ook feitelijk uitgereden.

- [x] Zonder sessie toont de app het loginformulier, niet de prognose — op `/` én `/analyse`
      — `LoginGate` staat in `app/layout.tsx` en omsluit dus beide routes; zonder sessie
      wordt `children` nooit gerenderd
- [x] Tijdens de sessiecontrole verschijnt een skelet, geen lege of flitsende prognose —
      `isChecking` in `auth-context.tsx` begint op `true` en gaat pas na `getSession()` uit;
      `LoginGate` toont zolang een `aria-busy` skelet
- [x] Foute credentials tonen een melding onder het veld; het e-mailveld blijft ingevuld —
      `LoginForm.tsx:36` wist alleen het wachtwoord, de melding staat als `role="alert"`
      onder de velden
- [x] Een tweede klik tijdens een lopende poging doet niets — `if (busy) return` plús
      `disabled={busy}` op de knop; `busy` blijft na succes bewust staan
- [x] Netwerkfout geeft een andere melding dan foute credentials — `isAuthApiError` splitst
      de twee; een transportfout is geen `AuthApiError`
- [x] Een sessie die tijdens gebruik vervalt brengt je terug naar het formulier zonder
      dataverlies aan serverzijde — `onAuthStateChange` zet de sessie op `null` en de poort
      valt vanzelf terug; de schrijfkant is puur remote, dus er staat niets lokaal te wachten
- [x] Uitloggen wist de sessie en toont het formulier — `SignOutButton` → `signOut()` →
      dezelfde `onAuthStateChange`-weg
- [x] Na herladen blijf je ingelogd — supabase-js persisteert de sessie zelf; `getSession()`
      leest ze bij mount terug
- [x] Enter in het wachtwoordveld verstuurt; autofocus staat op e-mail — native
      `<form onSubmit>` en `autoFocus` op het e-mailveld
- [x] Geen enkele cashflowdata is zichtbaar of opvraagbaar zonder sessie — twee sloten, niet
      één: de poort rendert niets, en `supabase/schema.sql:73-97` scope't elke policy op
      beide tabellen aan `auth.uid()`. De UI-poort alleen zou een cosmetisch slot zijn

## Beslissingsgeschiedenis

- 2026-08-05: Aangemaakt. Volgt uit de keuze voor "puur remote" — bij local-first als
  cache was een loginpoort uitstelbaar geweest, nu is ze een voorwaarde om iets te tonen.
- 2026-08-05: Drie open vragen gesloten — inline poort, seed-script, geen reset-flow.
  Daarmee vervalt het registratie- én het resetscherm; het formulier houdt precies twee
  velden over.
