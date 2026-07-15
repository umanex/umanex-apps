# LEARNINGS.md — waargenomen fouten (staging)

Dit bestand is de **rauwe vangst** van momenten waarop een skill of werkprincipe faalde. Het staat los van CLAUDE.md: CLAUDE.md blijft schone instructie, LEARNINGS.md is de staging-area waaruit bewezen regels later naar de juiste CLAUDE.md **promoveren**.

Entries worden toegevoegd via de `vastleggen` skill — niet handmatig bewerken tenzij je een status bijwerkt.

## Waarom dit bestaat

Lessen verdampen anders. Door de fout én de **letterlijke input die hem uitlokte** te bewaren, wordt elke entry later herbruikbaar als verificatie-test: speel de input opnieuw af in een fresh sessie en kijk of de fout weg is.

## Statussen

Een entry doorloopt drie statussen:

- `open` — vastgelegd, nog niet gefixt.
- `verified` — gefixt én de input opnieuw getest in een fresh sessie; de fout is weg.
- `promoted` — de regel is gehard naar de juiste CLAUDE.md-laag (globaal / klant / project).

Geen score, geen severity, geen categorie. Bewust minimaal — capture moet wrijvingsloos zijn.

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

```
## YYYY-MM-DD — {skill of principe dat faalde}
- **Input:** {letterlijke prompt of bestandspad dat de fout uitlokte}
- **Fout:** {wat er misging, 1-2 zinnen}
- **Status:** open
```

<!-- De vastleggen skill voegt hieronder de juiste laag-header toe bij de eerste capture. -->

# Klant — umanex

## 2026-07-15 — Defensieve fallback bij een native module (Expo/RN)
- **Input:** `apps/rowtrack/lib/secureStorage.ts` — de opzet met een static top-level `import * as SecureStore from 'expo-secure-store'` boven een `useSecureStore()`-probe-in-try/catch die zogenaamd terugvalt op AsyncStorage.
- **Fout:** De static import evalueert bij module-load (Metro, eager), dus `requireNativeModule('ExpoSecureStore')` werpt vóór enige try/catch → de app crashte bij opstarten op een dev-client zonder de native module en de "defensieve fallback" schoot nooit in. De fallback werd als werkend gerapporteerd terwijl hij dat niet was; correcte aanpak = lazy `require()` binnen de try/catch (evalueert pas bij aanroep, dus opvangbaar).
- **Status:** open
