# Status Tracking

---
Datum:   2026-06-02
Type:    feature
Project: jobradar
Klant:   umanex
Status:  ready
---

---

```
TASK:        Voeg statussen toe aan jobs en leads zodat Jeroen kan bijhouden
             welke hij al bekeken, opgeslagen of afgewezen heeft.

CONTEXT:     jobradar dashboard — JobCard en LeadCard in de hoofdfeed.
             Status moet persisteren in SQLite (Drizzle migratie) en
             bewaard blijven over syncs heen (sync overschrijft status niet).

ELEMENTS:    - Status-indicator op JobCard en LeadCard
             - StatusDropdown per kaart (dropdown met 4 opties)
             - DB migratie: `status` kolom op `jobs` en `companies` tabel
             - API route om status te updaten (PATCH)
             - [ASSUMPTION: FilterBar krijgt een status-filter]

BEHAVIOUR:   - Gebruiker wijzigt status van een job/lead rechtstreeks op de kaart
             - Status blijft bewaard bij volgende sync (sync raakt status niet aan)
             - Nieuwe jobs/leads krijgen automatisch status `new`
             - [ASSUMPTION: Geen undo — status wijzigen is direct definitief]

CONSTRAINTS: - Desktop-first (zelfde als bestaand dashboard)
             - Tailwind + ShadCN primitieven
             - Geen extra dependencies
             - [ASSUMPTION: Status-waarden zijn een vaste enum, geen vrije tekst]
```

---

## Open vragen

_Geen._

## Aannames

- `[ASSUMPTION: Status-filter in FilterBar zit in scope]`
- `[ASSUMPTION: Geen undo voor status-wijzigingen]`
- `[ASSUMPTION: Status-waarden zijn een vaste enum]`
- `[ASSUMPTION: Nieuwe items krijgen automatisch status new bij insert]`

## Beslissingsgeschiedenis

- 2026-06-02: TC-EBC aangemaakt, scope = één feature over JobCard + LeadCard + DB + API
- 2026-06-02: Alle kritische items beantwoord — dropdown, new/saved/dismissed/contacted, statusfilter in FilterBar, dismissed blijft na sync
