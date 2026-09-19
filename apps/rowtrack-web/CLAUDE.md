# rowtrack-web — projectcontext

Commerciële site voor de RowTrack iOS-app. Next.js (App Router) + next-intl, dev op poort 3004.

Dit bestand is bewust **minimaal**: het bevat alleen wat gemeten is. Vul de rest aan wanneer er
echt aan deze app gewerkt wordt — verzonnen projectcontext is schadelijker dan geen.

## Design-DNA — RowTrack, niet umanex

Deze app consumeert **niet** `@umanex/config/tailwind/preset` en **niet** `@umanex/tokens`.
De site moet eruitzien als de app, dus hij draait op RowTrack's eigen dark-only rollaag via
`@umanex/rowtrack-tokens` — een package die `apps/rowtrack/tokens/tokens.json` leest en de
web-helft levert (CSS-variabelen + Tailwind-preset). De RN-helft blijft
`apps/rowtrack/style-dictionary.config.mjs`.

Gevolg: de utility-set is gelijk aan de tokenset. `bg-bg-base`, `text-fg-primary`,
`bg-accent`, `text-achievement`, `rounded-card`, `shadow-button-primary`. Wat geen rol is,
heeft geen utility. Wat ontbreekt staat in `packages/rowtrack-tokens/TOKENS-TODO.md` —
signaleren, niet verzinnen.

**Let op de DEFAULT-sleutel.** `border.default` wordt `border-border`, niet
`border-border-default`; hetzelfde geldt voor `accent.default` → `bg-accent`. Een klasse die
niet bestaat wordt door Tailwind in een `className` stil genegeerd — de kleur valt dan terug
op Tailwinds eigen palet zonder één foutmelding. Daar staat een guard op:

```
pnpm --filter @umanex/rowtrack-tokens guard
pnpm --filter @umanex/rowtrack-tokens guard:selftest   # bewijst dat hij kán falen
```

**Nog niet compleet.** Web-typeschaal, spacing boven 48, container-widths, motion en
focus-ring ontbreken in de bron. Tot die er zijn gebruikt de scaffold Tailwinds eigen
schaal voor maten; dat is gemarkeerd met een `TODO` in `app/[locale]/page.tsx` en het is
géén precedent.

## Copy

Alle gebruikerszichtbare tekst staat in `messages/nl.json` en loopt via next-intl. Geen
hardcoded strings in `.tsx`. Locales staan op één plek: `i18n/routing.ts`. Er staat bewust
alleen `nl` in — zie de toelichting in dat bestand.

**Elke feitelijke claim** over de app wordt getoetst aan de waarheidstabel in
`briefings/2026-08-09-feature-rowtrack-web-marketingsite.tcebc.md`. De app heeft geen
Apple Health, geen in-app-aankopen, twee persoonlijke records (niet drie), en calorieën
worden berekend in plaats van uitgelezen. De site mag niets beloven dat daar niet in staat.

## Design-systeem-bron

Welke laag deze app zijn vorm van krijgt. Gemeten, niet afgeleid: `scripts/design-system-guard.mjs`
toetst elke regel hieronder tegen wat er op schijf staat. "geen" is overal een geldig antwoord,
mits het er staat.

- **Preset:** `@umanex/rowtrack-tokens/tailwind/preset`
- **Componentbron:** `eigen` — `components/ui/`, op RowTrack's dark-only rollaag
- **Storybook:** `geen` — de componenten zijn site-specifiek en hebben geen tweede consument

Zie ook *Design-DNA — RowTrack, niet umanex* hierboven. Krijgt deze laag ooit een tweede
consument, dan is de vorm een eigen Storybook die als `ref` in die van `packages/ui` hangt,
niet een verhuizing naar `@umanex/ui`.

---

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-09 door het te draaien, niet door
het af te leiden. Staat er "geen", dan is dat een gat dat gebouwd moet worden — geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `pnpm --filter rowtrack-web flow --shot=.flow-shots` — full-page PNG per route op de verse build. `.flow-shots/` is gitignored: bewijs van één run, geen artefact. |
| **Flow aandrijven** | `pnpm --filter rowtrack-web flow` — Playwright op een verse build. Laadt de routes uit `ROUTES` en telt console-fouten. `--headed` om mee te kijken. |
| **Detector draaien** | `pnpm --filter rowtrack-web exec node scripts/detect.mjs` — verse build en eigen server op **3104** (zoals de harness; weigert bij een bezette poort). Vier instrumenten over de vier routes op 1280×800 én 390×844: axe-core (structuur en semantiek, WCAG 2.x A/AA + best-practice, **inclusief `incomplete`**), `impeccable detect`, touch targets ≥ 24 px en contrast voor effen kleurparen. Elke telling draagt zijn noemer; wat niet meetbaar is komt terug als `onmeetbaar` mét reden, niet als groen. Exit 0 = schoon, 2 = bevindingen, 1 = een cel niet gemeten. `--no-build` hergebruikt `.next`, `--out=.detect-out` bewaart de ruwe JSON (gitignored), `--full` zet alle ignores uit. Sinds 2026-09-14 is dit het gedeelde template uit `umanex-os/templates/detect.mjs` met een `.detect.config.json` ernaast — routes, poort en build-commando staan daar, niet meer in het script. |

**`--scope` is eruit, ignores per regel-id zijn ervoor in de plaats — en dat is gemeten.**
Scope is een *domein*filter, geen ruisfilter: `type,layout` gooide `cramped-padding` weg
sámen met de smaakregels, en liet `kicker-above-heading` juist staan. Per regel-id
uitzetten laat de meetbare regels intact. Gemeten 2026-09-14 op deze app, beide kanten,
`--no-build`, twee runs:

| | impeccable | waarvan meetbaar |
|---|---|---|
| zonder ignores | 40 + 10 advisory | `line-length` 15 · `cramped-padding` 4 · `text-overflow` 1 |
| met de acht ignores | **20** + 0 advisory | dezelfde 20 |

De dertig die wegvallen zijn precies de smaakregels: `dark-glow` 8, `nested-cards` 8,
`radial-spotlight-glow` 4, `gpt-thin-border-wide-shadow` 4, `em-dash-overuse` 4,
`codex-grid-background` 2 — de premium-laag die bewust zo ontworpen is. `low-contrast` en
`kicker-above-heading` stonden er al. Alle acht ids zijn door `impeccable doctor --json`
bevestigd als bestaand (`ruleRegistryAvailable: true`, nul `detector-ignore-rules-unknown`);
`scripts/test-impeccable.sh` in umanex-os bewaakt dat een update ze niet stil hernoemt — sinds 2026-09-19 door de lijst uit deze config af te leiden in plaats van uit een eigen kopie, dus een nieuwe ignore telt daar automatisch mee. De redenen hierboven staan sindsdien óók machine-leesbaar in `.impeccable/config.json` als `ignoreReasons`, naast `ignoreRules`: dezelfde guard eist dat die twee sleutels dezelfde verzameling dekken, beide kanten op. Bij verschil is de config leidend.

**Twee metingen die er vóór 2026-09-14 niet waren.** Touch targets: **31 van de 70** gemeten
zichtbare interactieve elementen zitten onder 24 px — geen van beide detectors zag die ooit.
En contrast: **0 van 1010** tekstnodes zakt onder de eis, met **166 onmeetbaar** (verloop of
afbeelding als achtergrond). Dat tweede getal is het punt: impeccable's `low-contrast` meldde
op precies die nodes 1,8:1 waar de pixels 7,70:1 gaven. Wat niet te meten is, heet hier
onmeetbaar in plaats van te worden geraden.

| **State forceren** | **Geen.** Statische marketingsite zonder data-laag en zonder formulier: er is niets dat kan laden, leeg zijn of falen. Loading/empty/error zijn hier niet van toepassing in plaats van onbereikbaar — dat verschil is belangrijk, want het is géén gat dat gedicht moet worden. Komt er een supportformulier, dan verandert dit. |
| **Invariant draaien** | **Geen, en niet nodig.** Geen afgeleide berekeningen in deze app. |
| **Verse build** | Zit ín de harness: altijd eerst `next build`, dan `next start` op **3104**, en hij weigert als daar al iets luistert. Een dev-server op 3004 blijft ongemoeid. |

**De harness kan falen, en dat is getoetst.** `pnpm --filter rowtrack-web flow --selftest` voegt
een scenario toe dat hóórt te falen. Let op de omkering: die run eindigt op **exit 0** wanneer de
bewuste assertie inderdaad faalde. Blijft hij groen zónder die melding, dan meet de harness niets.

**Routes gaan altijd met locale-prefix.** `/` verwijst door naar `/nl`; een harness-route zonder
prefix meet de redirect, niet de pagina.

## Tokens herbouwen

```
pnpm --filter @umanex/rowtrack-tokens build
```

Draait automatisch mee via `turbo`'s `^build` vóór elke app-build. Let op: de `pre-commit`-hook
herbouwt alleen `constants/` van apps mét een `tokens:build`-script — deze package valt daar
buiten en wordt dus door `turbo` gedekt, niet door de hook.
