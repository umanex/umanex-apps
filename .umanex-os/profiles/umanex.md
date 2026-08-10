# Profile — umanex

Klant-laag voor umanex (jouw eigen werk). Gelaagd op de globale `CLAUDE.md` in `umanex-os`. Bevat wat over umanex als merk en werkstijl weten nodig is om zinvolle design-, copy- en architectuur-keuzes te maken.

Belangrijk verschil met klant-profiles: hier ben *jij* het merk. Het profile beschrijft jou als product-stijl en werkstijl, niet een externe klant.

**Wat hier niet hoort:** een opsomming van concrete apps of hun status. Die is afleidbaar met één `ls apps/` in `umanex-apps`, en veroudert hier stil — zodat een sessie redeneert over een app die er niet meer is. Per-app context staat in `apps/{app}/CLAUDE.md`. Wat wél hier hoort: wat je nergens uit de code kan aflezen.

---

## Wie en wat

**umanex** is Jeroens freelance label voor zowel klantwerk als eigen producten en diensten. Eén persoon, niet een team.

Positionering: **"Design Team Of One"** — helpt complexe B2B software teams sneller gebruiksvriendelijke functionaliteiten lanceren. Focus op UX voor B2B omgevingen.

**Toekomst:** AI-gedreven aanpak. Het umanex-os project (waarvan dit profile deel uitmaakt) is de praktische uitwerking daarvan. Een evolutie van "Design Team Of One" naar "Design Team Of One + AI".

### Soorten output

Vier categorieën, die bepalen hoe je over een vraag redeneert:

- **Portfolio** — eigen showcase op umanex.be
- **Eigen producten** — apps, tools en websites die je verkoopt of weggeeft
- **Klantwerk** — niet onder umanex-merk gepubliceerd, maar onder de hood gebouwd door umanex
- **Consultancy** — strategisch werk, AI-aanpakken, design system rollouts

Alle eigen web- en mobile-apps leven in de `umanex-apps` monorepo, onder `apps/{app}/`.

### Doelgroep

Drie groepen, met dezelfde umanex-stem maar nuance per context:

- **Designers en dev teams in business software** — voor consultancy en klantwerk
- **Freelancers en kleine bedrijven** — die hun eigen tools willen bouwen
- **Jezelf** — tools die je dagelijks gebruikt en deelt

---

## Tone of voice

### Aanspreking en register

- **Je-vorm** — persoonlijk en warm. *"Je krijgt een design dat..."*
- **Direct + zelfverzekerd + vakman** — combinatie van *"Ik bouw..."* en *"In mijn ervaring..."*. Niet bescheiden. Niet ambtelijk. Niet over-marketing
- **Expert-toon mag** — *"Hier zijn de drie patronen die ik altijd zie:"* — past bij 10+ jaar ervaring

Geen aanspreking-vermijding zoals bij Columba. Geen voornaamwoord-nuance per taal zoals bij Luminus. umanex spreekt mensen aan als persoon — *"je"*, niet *"u"* of *"de gebruiker"*.

### Lengte en stijl

Geen vaste regels rond lengte. Geschikt voor:
- *Long-form copy* — blogposts, project case-studies, LinkedIn artikels
- *Korte zelfstandige zinnen* — portfolio intro's, button labels
- *Concrete actie-formuleringen* — bij prospect-reacties (zie voorbeelden onder)

### Taal

**Nederlands hoofdzakelijk**. Engels waar onvermijdelijk (technische termen die in NL ongebruikelijk zijn — *"design system", "tokens", "components", "edge cases"*).

Niet vertalen wat in het vakgebied actief Engels gebruikt wordt.

### Vocabulair

**Vakwoorden die actief gebruikt worden:**
- Design: design system, tokens, components, edge cases
- Positionering: B2B software, complex UX, business software teams
- Toekomst: workflow, AI-aanpak, agent, prompt
- Product/startup: lean, ship, iterate

**Termen die actief vermeden worden:**
- *Buzzwords:* "unleash", "empower", "transform", "next-level"
- *Corporate-jargon:* "leverage", "synergize", "best-in-class"
- *Zelfondermijning:* "misschien", "ik denk", "ik weet niet zeker"
- *Te-veel-modesty:* "gewoon", "simpel", "niets bijzonders"

Het juiste midden: **direct, met vakkennis, zonder marketing-fluff of ondermijning**.

### Concrete voorbeelden

**Portfolio of LinkedIn intro:**

> "Ik help complexe B2B teams sneller gebruiksvriendelijke functionaliteiten lanceren. Design Team Of One — voor B2B software die echt werkt."

**Eerste reactie op een prospect-aanvraag:**

> "Bedankt. Een snelle eerste check leert dat dit haalbaar is. Ik kom morgen terug met een concreter voorstel."

Concreet, met expert-signaal, met tijdsindicatie. Niet *"Bedankt voor je bericht! Ik kijk graag..."* (te zacht, ondermijnt de directe-vakman-stem).

---

## Visueel en design

### Centrale design source

umanex heeft een **eigen `tokens.json` + Figma library** — gedeeld over portfolio en eigen producten. Eén umanex-DNA voor visueel werk. Dat is de default voor élk umanex-project.

**Een app mag een eigen token-set hebben** wanneer de context genoeg verschilt van web-DNA. De staande uitzondering is RowTrack (mobile): eigen `tokens.json`, eigen Figma-bron. Werk je aan zo'n app, gebruik dan de token-set van die app, niet de gedeelde umanex-set.

Bij twijfel welke tokens te gebruiken: vraag of het project umanex-DNA volgt of project-eigen DNA heeft. Welke set een app effectief gebruikt, lees je in zijn eigen `CLAUDE.md` — niet hier.

### Visuele karakteristiek

**ShadCN-stijl** — minimaal, neutraal, modern. Light + dark mode altijd ondersteund.

Niet "eigen merkstijl met sterke kleur en typografie". Niet "luxe en visueel rijk". Functioneel-neutraal — past bij de B2B software focus.

### Iconen

Geen vaste regel — wat past per project. Geen verplichte icon-bron over alle umanex projecten heen.

Staande keuzes per platform:
- **Web:** typisch Lucide
- **Mobile (Expo):** `@expo/vector-icons` (Ionicons) — om historische redenen rond de Fabric renderer, niet uit voorkeur

Bij twijfel: kijk naar het project zelf, of vraag.

### Layout-patronen

Geen vast voorgeschreven layout-patroon op profile-niveau. Per project context-passend gekozen.

### Visuele/structurele regels

Twee regels die wel altijd gelden:

- **Mobile-first denken** voor portfolio en consumer-tools
- **Toegankelijkheid** als basisprincipe — keyboard navigatie, screen readers, semantische HTML

---

## Tech

### Web werk

- **Next.js 14** + **TypeScript** + **Tailwind** + **ShadCN** — standaard stack voor portfolio en web producten
- **Tokens Studio + Style Dictionary** — design tokens pipeline, output naar CSS variables

### Mobile werk

- **React Native + Expo** — standaard stack voor mobile

### Hosting en infra

- **Vercel** — web hosting voor portfolio en web producten
- **Supabase** — default backend waar een app er een nodig heeft (auth, data, realtime)
- **GitHub** — code hosting voor alle umanex projecten (organisatie: github.com/umanex)

### Deploys

Vercel deployments doe **ik zelf manueel** — niet automatisch laten triggeren door Claude. Dit is een umanex-specifieke regel die de globale CLAUDE.md "geen Vercel deploys" regel concretiseert.

---

## Werkstijl

### Do's

- **Snelle iteraties met tussentijdse demo's** — *"ship to learn"*. Niet maandenlang in stealth bouwen
- **Klant betrekken in keuzes** — design-as-conversation. Niet beslissen voor de klant maar mét de klant
- **Pragmatisme boven perfectie** — 80/20 regel actief toepassen. Goed genoeg dat verzonden kan, niet eindeloos polijsten
- **Eigen onderzoek/experiment integreren in elk project** — RowTrack ontstond als uitloper van onderzoek naar BLE-integratie en gamification, niet als geïsoleerd product

### Don'ts

- **Werk zonder eind aan refinement** — tijd voor *"goed genoeg"*. Bij twijfel: ship en itereer
- **Endless scope creep** — strakke scope-discipline. Wanneer een vraag buiten scope valt: benoem het, parkeer het, of bespreek scope-uitbreiding expliciet

---

## Spanningen om bewust van te zijn

Drie dingen die in elke umanex-beslissing kunnen meespelen:

1. **Diverse doelgroepen onder één merk** — designers, freelancers en jezelf zijn verschillende lezers. De umanex-stem (direct, vakman, je-vorm) is constant, maar de *diepte* en het *vakjargon* mag schalen. Voor designers mag je dieper gaan dan voor een freelancer-eindgebruiker

2. **Klant- versus eigen werk** — klantwerk wordt onder de hood gemaakt door umanex maar niet onder umanex-merk gepubliceerd. Eigen werk wel. Tone, depth en stijl kunnen verschillen — bij twijfel: vraag voor wie de output bedoeld is

3. **umanex-DNA versus project-DNA** — RowTrack heeft eigen tokens en eigen styling-keuzes. Niet alles wat onder umanex-paraplu valt deelt automatisch dezelfde visuele DNA. Wanneer een briefing voor een umanex project is, vraag eerst of het project umanex-DNA volgt of project-eigen DNA heeft.
