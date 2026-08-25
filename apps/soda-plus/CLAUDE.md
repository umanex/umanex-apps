# soda-plus — projectcontext

Designopdracht voor de sollicitatie bij **soda+**. Next.js (App Router), dev op poort 3004.

Dit bestand is bewust **minimaal**: het bevat alleen wat vaststaat. Vul aan naarmate de
opdracht duidelijk wordt — verzonnen projectcontext is schadelijker dan geen.

## Wat vaststaat

- De app heet `soda-plus` op schijf en in git (`feat(soda-plus): ...`); `soda+` is de merknaam.
- Eigen worktree: `../umanex-apps-soda-plus`.
- Stack conform monorepo-default: Next.js 14 + Tailwind 3, rollaag via `@umanex/config/tailwind/preset`,
  `@umanex/ui` en `@umanex/tokens` als workspace-deps. Geen DB, geen auth, geen mail.

## Wat nog open staat

- De opdracht zelf — inhoud van de brief van soda+. Zonder die brief geen TC-EBC en dus geen schermwerk.
- Merk-context: type-stack, kleur, tone of voice. `app/layout.tsx` draait nu op de
  fallback-fontstack; het next/font-blok komt er zodra de huisstijl vaststaat.
- Deliverable-vorm: is dit een klikbaar prototype, een casepresentatie, of allebei?

## Verify-pad

Nog geen. `pnpm --filter soda-plus type-check` en `build` draaien; er is nog geen flow-harness
(`scripts/flow-harness.mjs`) zoals bij portfolio en jobradar. Dat is een gat, geen vergetelheid —
bouw hem wanneer er schermen zijn om vast te leggen.
