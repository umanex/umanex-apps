# UX-audit — umanex.be portfolio website

- **Geaudit:** volledige site (3 pagina's: home, /design-services, /design-team-of-one)
- **Datum:** 2026-06-10
- **Platform:** web (responsive)
- **Methodiek:** IxDF-framework — 7 UX-factoren (Morville), 5 usability-karakteristieken (ISO 9241-11), 5 interactie-dimensies (Crampton Smith & Silver)
- **Bewijsmateriaal:** live content-fetch van alle drie de pagina's + ruwe HTML-inspectie van de homepage. **Geen screenshots beschikbaar** — visuele beoordelingen zijn gemarkeerd als aanname.

---

## Samenvatting

**Totaalscore: 50/85 (≈ 59/100) — Grade D: grote issues, redesign nodig.**

Top-3 kritische prioriteiten:

1. **De AI-native aanpak is volledig afwezig** — nul vermeldingen van AI, agents, automation of tooling op de hele site, terwijl dit de strategische kernpositionering is ("Design Team Of One + AI"). De site verkoopt het umanex van 2024, niet dat van 2026.
2. **Geen enkel bewijs** — geen cases, geen resultaten, geen testimonials. Alleen "Enkele bedrijven waar ik al mee samen heb gewerkt" zonder detail. Credibility steunt nu volledig op BTW-nummer en adres.
3. **De site demonstreert niet wat ze verkoopt** — een designer die design systems, tokens-pipelines en een AI-werkwijze verkoopt, presenteert zich op een Framer-template in plaats van op de eigen stack (Next.js + eigen tokens). De site ís het portfolio-stuk dat ontbreekt.

Kernbevinding: de site is netjes, helder en compact, maar functioneert als digitaal visitekaartje in plaats van als overtuigingsmachine. De copy is on-brand (direct, vakman, je-vorm), de structuur is simpel — maar zonder cases, zonder AI-verhaal en zonder conversie-pad laat hij de twee dingen liggen die een prospect over de streep trekken: bewijs en onderscheid.

---

## 1. De 7 UX-factoren

| Factor | Score | Toelichting |
|--------|-------|-------------|
| Useful | 3/5 | Beantwoordt "wat doet umanex" maar niet "waarom umanex i.p.v. een ander" |
| Usable | 4/5 | Drie pagina's, vlakke navigatie, heldere structuur. [Deels aanname — geen visueel] |
| Findable | 3/5 | Weinig content dus alles vindbaar; maar wat prospects zoeken (cases, aanpak-detail) bestaat niet |
| Credible | 3/5 | BTW, adres, LinkedIn, klantvermelding aanwezig — maar geen cases, resultaten of testimonials |
| Desirable | 3/5 | [GEEN DATA — aanname] Geen screenshot beschikbaar; Framer-output is doorgaans verzorgd maar generiek |
| Accessible | 2/5 | 8 `<img>`-tags zonder `alt`-attribuut in de homepage-HTML; Framer genereert div-zware markup. `lang="nl-BE"` en viewport wél correct |
| Valuable | 2/5 | Voor de business: geen conversie-funnel, geen differentiatie. De strategische AI-positionering — het verkoopargument voor 2026 — ontbreekt volledig |

**Subtotaal: 20/35**

Detail per zwakste factor:

- **Accessible** — bewijs: `grep` op de live HTML toont 8 img-tags zonder alt. Dit botst met het eigen umanex-basisprincipe "toegankelijkheid als basisprincipe — keyboard navigatie, screen readers, semantische HTML" (profiel). Op Framer is dit maar beperkt fixbaar.
- **Valuable** — de problemenlijst op de homepage (kostbare herzieningen, scope-wijzigingen, …) is sterk en herkenbaar voor de doelgroep, maar de oplossing eindigt bij "ik ben één toegewijde designer". Het AI-multiplier-argument — waarom één designer vandaag de output van een klein team levert — wordt nergens gemaakt.

## 2. De 5 usability-karakteristieken

| Karakteristiek | Score | Toelichting |
|---------------|-------|-------------|
| Effectiveness | 3/5 | Prospect kan begrijpen wat umanex doet en contact opnemen; overtuigd raken lukt niet zonder bewijs |
| Efficiency | 4/5 | Compacte site, drie pagina's, weinig klikken nodig |
| Engagement | 2/5 | Statische tekstlijsten; geen verhaal, geen demo's, geen interactie. [Deels aanname — geen visueel] |
| Error tolerance | 3/5 | Nauwelijks interactie dus weinig fout te maken; geen contactformulier betekent ook geen validatie-frictie — maar ook geen laagdrempelige conversie |
| Ease of learning | 4/5 | Triviaal te begrijpen bij eerste bezoek |

**Subtotaal: 16/25**

**Utility-check (juiste features aanwezig?):** Nee — dit is het kernprobleem, niet de usability. Ontbrekende features: portfolio-cases, AI-werkwijze-uitleg, contactformulier of boekingslink, resultaten/metrics, eventueel EN-versie. De formule Utility + Usability = Usefulness faalt hier aan de utility-kant: de site is makkelijk te gebruiken maar er valt te weinig te gebruiken.

## 3. De 5 interactie-dimensies

| Dimensie | Score | Toelichting |
|----------|-------|-------------|
| Words | 3/5 | Copy is on-brand (direct, vakman, je-vorm, geen buzzwords). Maar: meta description voert de oude positionering ("freelance UX/UI designer … grafisch ontwerp") i.p.v. "Design Team Of One"; spelfout "ondermeer" (→ "onder meer"); geen AI-vocabulaire |
| Visual representations | 3/5 | [GEEN DATA — aanname] Geen screenshot; og:image aanwezig |
| Physical / space | 3/5 | [Deels aanname] Viewport correct; Framer is doorgaans responsive; touch targets niet verifieerbaar zonder visueel |
| Time | 2/5 | Homepage-HTML alleen al 554 KB met zware inline Framer-runtime — merkbaar trager dan een statische Next.js-pagina, zeker mobiel |
| Behavior | 3/5 | [Aanname] Weinig interactieve elementen; anchor-navigatie naar #contact; geen zichtbare systeemstatus nodig bij deze eenvoud |

**Subtotaal: 14/25**

---

## Geprioriteerde bevindingen

| # | Prio | Bevinding | Geschonden items | Impact | Effort |
|---|------|-----------|------------------|--------|--------|
| 1 | P0 | AI-native positionering ontbreekt volledig — site vertelt het verhaal van 2024 | Valuable, Useful, Words | Strategisch: prospects zien het onderscheidend vermogen niet | M (vergt nieuwe content + structuur) |
| 2 | P0 | Geen cases, resultaten of testimonials — geen bewijs | Credible, Valuable, Engagement | Prospects kunnen niet valideren; conversie-killer in B2B | M–L (content moet gemaakt worden) |
| 3 | P1 | Meta description en SEO-copy voeren de oude positionering | Words, Findable, Credible | Eerste indruk in Google ≠ merkboodschap | S |
| 4 | P1 | 8 afbeeldingen zonder alt-tekst; div-zware Framer-markup | Accessible | Screen reader-gebruikers; botst met eigen principe | S op nieuwe stack, beperkt fixbaar op Framer |
| 5 | P1 | Site staat op Framer terwijl de eigen stack Next.js + tokens is — geen dogfooding | Credible, Desirable | De site is zelf geen portfolio-stuk; tokens-pipeline en AI-werkwijze niet demonstreerbaar | L (= de nieuwe site) |
| 6 | P2 | Geen contactformulier of boekingslink — alleen mailto/tel/anchor | Valuable, Error tolerance | Hogere drempel tot eerste contact | S–M |
| 7 | P2 | 554 KB HTML + Framer-runtime — performance | Time | Trage first load, mobiel voelbaar | Opgelost door nieuwe stack |
| 8 | P3 | Alleen NL — internationale prospects (EN) onbereikbaar | Findable, Useful | Afhankelijk van doelmarkt | M |

---

## Redesign-voorstellen

### Voorstel 1 — Nieuwe site op eigen stack als levend portfolio-stuk (bevindingen 1, 5, 7)

**Huidige issues:** Framer-template zonder AI-verhaal, zonder eigen DNA, met performance-overhead.

**Oplossing:** nieuwe Next.js 14-app onder `umanex-apps/apps/`, gebouwd met de eigen `packages/tokens` pipeline en ShadCN-stijl componenten, light + dark mode. De site wordt zelf het bewijsstuk: "deze site is gebouwd met dezelfde tokens-pipeline en AI-werkwijze die ik bij jou inzet". Optioneel: een "colofon"-sectie die de stack en werkwijze transparant toont.

**Verwacht effect:** Credible 3→4, Valuable 2→4, Time 2→4, Accessible 2→4 (eigen markup, alt-discipline).
**Effort:** L — maar gepland werk (dit is de nieuwe site).

### Voorstel 2 — AI-native verhaal als kern van de informatie-architectuur (bevinding 1)

**Huidige issues:** positionering "Design Team Of One" zonder de "+ AI"-evolutie; de problemenlijst krijgt geen onderscheidend antwoord.

**Oplossing:** de bestaande sterke probleemstelling behouden, maar het antwoord herschrijven rond de AI-multiplier: één designer + AI-agents = team-output. Concreet maken met werkwijze (umanex-os, TC-EBC-briefings, design tokens → code pipeline, Figma ↔ code sync) in plaats van abstracte AI-claims — dat past bij de no-buzzwords vocabulaireregel.

**Verwacht effect:** Valuable 2→4, Useful 3→4, Words 3→4.
**Effort:** M (copywriting + structuur).

### Voorstel 3 — Bewijslaag: cases met resultaten (bevinding 2)

**Huidige issues:** "Enkele bedrijven waar ik al mee samen heb gewerkt" zonder inhoud.

**Oplossing:** 2–3 case-studies (klantwerk geanonimiseerd waar nodig, eigen producten zoals RowTrack als volwaardige case van de AI-werkwijze). Format per case: probleem → aanpak → resultaat. Eigen producten zijn hier een troef: volledig toonbaar, geen NDA.

**Verwacht effect:** Credible 3→5, Engagement 2→4, Effectiveness 3→4.
**Effort:** M–L (contentcreatie is het echte werk, niet de bouw).

### Voorstel 4 — Conversiepad + SEO-basis (bevindingen 3, 6)

**Oplossing:** contactformulier of cal-boekingslink naast mailto; meta descriptions per pagina herschrijven naar de actuele positionering; alt-teksten overal.

**Verwacht effect:** Findable 3→4, Error tolerance n.v.t.→ lagere contactdrempel.
**Effort:** S.

---

## Research-aanbevelingen

1. **Prospect-interviews (3–5)** — valideer of het AI-native verhaal voor B2B software teams een trekker of een afschrikker is, en welke bewijsvorm (cases vs. live demo's vs. werkwijze-transparantie) het zwaarst weegt. Belangrijkste open aanname van deze audit.
2. **Analytics op de huidige site** — als Framer-analytics beschikbaar zijn: welke pagina's worden bekeken, waar haken bezoekers af, hoeveel contact-clicks. Nu `[GEEN DATA]` — alle engagement-scores zijn expert-inschattingen.
3. **Visuele review** — deze audit miste screenshots; een korte visuele pass (typografie, hiërarchie, spacing) vóór de nieuwe site het oude design al dan niet hergebruikt.

---

## Methodiek & limieten

Dit is een **expert-review zonder gebruikersdata** — te valideren met echte prospects. Aannames:

- Visuele kwaliteit (Desirable, Visual representations, Physical/space, Behavior) is ingeschat zonder screenshots — gemarkeerd in de tabellen.
- Geen analytics of user feedback beschikbaar; engagement- en effectiveness-scores zijn inschattingen.
- Provisionele persona's gebruikt: (a) *productmanager/lead bij B2B software-bedrijf* — zoekt snel inzetbare design-capaciteit, scant op bewijs en werkwijze, beslist mee over inhuur; (b) *freelancer/klein bedrijf* — zoekt iemand die een eigen tool kan bouwen, gevoeliger voor concrete voorbeelden dan voor proces. Beide: NL-talig, desktop én mobiel.
- Mogelijke bias: de auditor kent de strategische intentie (AI-native herpositionering) — bevinding 1 weegt daardoor mogelijk zwaarder dan een blinde reviewer ze zou scoren. De afwezigheid van AI-vermeldingen is wel een objectief feit.
- Technische vaststelling: de site draait op **Framer** (generator-tag `Framer 0b89d47`), niet op Next.js zoals het umanex-profiel vermeldt — het profiel beschrijft vermoedelijk de doelarchitectuur.
