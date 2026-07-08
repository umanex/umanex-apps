# TC-EBC — Vyvey Interieur: site-migratie Framer → Next.js

| | |
|---|---|
| **Datum** | 2026-06-19 |
| **Type** | feature |
| **Project** | vyvey (`apps/vyvey`, umanex-apps monorepo) |
| **Klant** | Vyvey Interieur (Jabbeke) |
| **Status** | Akkoord — scaffold in uitvoering |

---

```
TASK:        Migreer de bestaande Vyvey-onepager van Framer naar een eigen Next.js 14-app
             (Vercel-deploybaar), visueel getrouw aan het origineel en zonder Framer-afhankelijkheid.

CONTEXT:     Klantsite voor interieurbedrijf Vyvey. Live draait op Framer (www.vyveyinterieur.be).
             Doel: eigen codebase met Vyvey's branding. Leeft in apps/vyvey maar is zelfstandig —
             eigen Tailwind-theme, eigen components, GEEN umanex-tokens of @umanex/ui.

ELEMENTS:    - Sticky header: logo + anchor-nav (Diensten / Over ons / Contact) + mobiele hamburger
             - Hero: "Met passie & expertise creëren wij uw droominterieur" / "Vyvey, het andere
               interieur" + hero-beeld + CTA
             - Diensten-blok: 3 cards — Advies / Persoonlijk Contact / Kwaliteit voor elk budget
             - Dienst-categorieën: Totaalinrichting / Interieur & decoratie / Decoratiewerken (+ beelden)
             - Over ons: familiebedrijf 50+ jaar, Mieke (klantrelaties) & Erik (uitvoering),
               "Steeds aanwezig op de werkvloer"
             - Contact: adres (Hogedijkenstraat 1, 8490 Jabbeke), tel (050 81 35 89),
               mail (miekevyvey@skynet.be), openingsuren, CTA "Bel mij terug om een afspraak in
               te plannen" / "Nood aan inspiratie?"
             - Callback-form: naam, telefoon, e-mail (optioneel), bericht
             - Footer: openingsuren, links Algemene voorwaarden + Privacy, BTW BE 0824.546.223
             - Aparte routes: /algemene-voorwaarden, /privacy (placeholder-tekst)

BEHAVIOUR:   - Anchor-nav smooth-scroll naar secties; hamburger opent/sluit mobiel menu
             - tel: en mailto: links
             - Callback-form → POST /api/contact → Resend → success- en error-state in de UI;
               server-side validatie (zod)
             - Entrance/scroll-animaties zo getrouw mogelijk t.o.v. Framer (framer-motion;
               timing/easing afgeleid uit de Framer appear-definities)

CONSTRAINTS: - Mobile-first responsive, Framer-breakpoints (desktop/tablet/phone) nagebootst
             - NL (Vlaams)
             - Font: Lexend Deca (self-hosted via next/font)
             - Palet: cream #f9f7f0 / grey #414141 / slate #393e46 / warm bruin #9c7460 + varianten
             - Toegankelijk: semantische HTML, keyboard-nav, focus-states, alt-teksten
             - Next.js 14 App Router, TS strict, Tailwind; 1 component = 1 file, named exports
             - 11 beelden lokaal in /public (geen framerusercontent-afhankelijkheid)
             - SEO-meta + og:image behouden; Vercel deploy doet Jeroen zelf
```

---

## Open vragen

- Definitieve tekst voor Algemene voorwaarden en Privacy (nu placeholder).
- `RESEND_API_KEY` + verificatie van `vyveyinterieur.be` als sending-domain (anders test-afzender `onboarding@resend.dev`).
- Bevestiging van de exacte copy per sectie (ik neem de live tekst 1:1 over; afwijkingen later).

## Aannames

- `[ASSUMPTION]` Eigen Vyvey-theme, geen umanex-DNA — klantwerk met eigen branding.
- `[ASSUMPTION]` Tekst en 11 beelden komen 1:1 van de live site; ik re-host de beelden.
- `[ASSUMPTION]` Geen CMS — content statisch in `lib/` (klein, zelden wijzigend).
- `[ASSUMPTION]` Callback-form vereist enkel naam + telefoon; e-mail en bericht optioneel.

## Beslissingsgeschiedenis

- 2026-06-19: Scope = klantproject Vyvey (Framer → Next.js migratie); locatie `apps/vyvey` (in monorepo, maar zelfstandig met eigen theme).
- 2026-06-19: Type van `screen` → `feature` — scope omvat onepager + /algemene-voorwaarden + /privacy + contact-backend.
- 2026-06-19: Contact = callback-form met success/error-states; mail via Resend (API-route), niet enkel tel/mailto.
- 2026-06-19: Animaties zo getrouw mogelijk nabootsen t.o.v. Framer; responsive expliciet als constraint.
