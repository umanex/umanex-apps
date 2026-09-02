# BACKLOG.md — gemeld, niet gebouwd (soda-plus)

Projectlaag van de backlog. Format, statussen en types: zie de kop van `BACKLOG.md` in de repo-root. Entries komen erbij op het moment van de melding. P3-bevindingen uit `ux-audit` en `security-audit` landen hier.

# Project — soda-plus

## 2026-08-25 — Voortgangsstreepjes tellen niets consistent · [ux]
- **Wat:** 02 toont 2/4, 03 toont 3/4 voor hetzelfde domein (Orde), 04 verbergt de streepjes met 4/4 erin (2:161). Streepjes = domeinen maken (03 erft 2/4), labelen ("Orde · 2 van 4") en de 02-regel "Vier korte vragen, dan je rapport" herschrijven naar "Vier domeinen, elk drie korte vragen".
- **Waarom niet nu:** P3-1 uit `audits/2026-08-25-ux-audit-wireframes.md` — hinder, geen blokkade; één fill en één copy-regel.
- **Eerste zet:** fills 2:121–2:124 gelijkzetten aan 2:41–2:44; tekst 2:51 aanpassen.
- **Gebouwd 2026-09-02:** 03 toont nu dezelfde 2/4 als 02 (fill 2:123 terug naar #d6d6d6), beide schermen dragen het label "domein 2 van 4", en 2:51 zegt "Vier domeinen, elk drie korte vragen". Wat openblijft: 04 verbergt de streepjes nog met 4/4 erin (2:161).
- **Status:** gebouwd

## 2026-08-25 — Touch-targets en geselecteerde staat · [ux]
- **Wat:** chips 35–37 px hoog (02, 06, 09), de 14 datumvakjes op 05 zijn 17×17 met tik-hint, "‹ Terug" is een tekstnode 52×20 zonder hit-frame; geselecteerde chips/knoppen zijn 2 px kleiner en 1 px verschoven (strokeAlign is al INSIDE — de frames zijn gewoon kleiner getekend). Chips naar 44 px, vakjes 20×20 met hit-area of één "Toon de data"-knop, één box voor beide staten.
- **Waarom niet nu:** P3-2 — de opdracht vraagt geen afwerking; alleen de vakjesstrip is expliciet interactief en dus geen afwerking.
- **Eerste zet:** pills op 02 (2:55/2:57 e.a.) naar h=44; strip 2:249 herontwerpen.
- **Deels gebouwd 2026-09-02:** de twaalf pills op 02 staan op 107×44 en geselecteerd/niet-geselecteerd zijn nu identiek in maat. Nog open: de chips op 06 en 09 (35–37 px), de 14 datumvakjes op 05 (17×17 — hun contrast is wél gefixt, de maat niet) en "‹ Terug" zonder hit-frame.
- **Status:** open

## 2026-08-25 — Hold-to-reveal op 04: klik, toetsenbord, copy, Present-mode · [ux]
- **Wat:** de geblurde kaart 2:214 heeft alleen ON_PRESS (→ 05) terwijl caption 04 "op chromebook: een klik" belooft; "Houd ingedrukt om te tonen" (2:217) is touch-only copy; een hold is niet toetsenbord-bereikbaar. Of ON_PRESS + NAVIGATE bij loslaten terugspringt naar 04 is niet geverifieerd — springt hij terug, dan is het hold-pad doodlopend en wordt dit P2.
- **Waarom niet nu:** P3-3 — gedocumenteerde pacing-keuze; het openstaande deel is een 10-secondentest in Present-mode.
- **Eerste zet:** Present-mode openen op 04, kaart indrukken en loslaten; daarna ON_CLICK toevoegen op 2:214 en copy "Tik of houd ingedrukt om te tonen".
- **Status:** open

## 2026-08-25 — "Ik zie het anders" heeft geen eigen pad · [ux]
- **Wat:** de drie antwoordknoppen op 05 (2:273/2:275/2:277) leiden via één CTA naar "Wat ga je doen?". Briefing-aanname zegt "plan wordt optioneel", caption 05 zegt "geen ontsnapping" — board en briefing spreken elkaar tegen. Eén cover-toestand of een CTA die meebeweegt met de keuze ("Zet op de agenda").
- **Waarom niet nu:** P3-4 — bewust alleen als caption; alleen de briefing-regel is stale.
- **Eerste zet:** briefing-aanname bijwerken naar wat het board doet, of cover-toestand toevoegen.
- **Status:** open

## 2026-08-25 — Delen omkeerbaar maken; "‹ Terug" op 08 · [ux]
- **Wat:** 2:346 "Delen" → 08 zonder bewerkvenster; 08 draagt "‹ Terug" (50:15) na "Gedeeld." — onbepaalde state. Eén regel "Je kan dit aanpassen tot de dag vóór het gesprek" en Terug vervangen door "Aanpassen".
- **Waarom niet nu:** P3-5 — 07 is zelf al de preview-vóór-delen (foutpreventie); het restant is een specificatiezin.
- **Eerste zet:** tekstregel op 08; 50:15 vervangen.
- **Status:** open

## 2026-08-25 — 03: "Iets anders …" en "Eén tik is genoeg" · [ux]
- **Wat:** 2:146 "Iets anders …" heeft geen veld en geen gedrag (impliceert typen — de tweede oorzaak van het lege kader volgens de cover); twee kaarten staan aangevinkt onder "Eén tik is genoeg" (single/multi onbepaald). Copy "Eén tik is genoeg, meer mag." en "Iets anders" als inline chip-veld met 3–4 extra opties, of schrappen en op de cover benoemen.
- **Waarom niet nu:** P3-6 — wireframe-stadium; één caption-regel volstaat voor de inzending.
- **Eerste zet:** tekst 2:128 aanpassen; beslissen over 2:146.
- **Status:** open

## 2026-08-25 — 05: strip per observatie, lege vakjes, "Wat klopt hiervan?" · [ux]
- **Wat:** alleen "Geen antwoord in het Nederlands" heeft een vakjesstrip (2:249); "Opdracht niet gestart 3/14" (2:265) niet, terwijl de hint voor beide geldt; lege vakjes `#d6d6d6` op `#f4f4f4` = 1,32:1; "Wat klopt hiervan?" (2:272) staat onder telling én lezing zonder dat de leerling "de telling klopt, de lezing niet" kan zeggen — terwijl dat de these van het scherm is.
- **Waarom niet nu:** P3-7 — detail op een scherm dat inhoudelijk klopt.
- **Eerste zet:** één strip per observatie of één gedeelde kalenderstrip; vraag herformuleren ("Kloppen die lessen?") of extra knop bij de lezing.
- **Deels gebouwd 2026-09-02:** de lege vakjes gingen van #d6d6d6 (1,32:1) naar een #6b6b6b-rand, en de hint staat nu direct onder de strip in plaats van onder "Opdracht niet gestart". Nog open: de tweede observatie heeft nog steeds geen strip, en "Wat klopt hiervan?" laat "de telling klopt, de lezing niet" nog niet zeggen.
- **Status:** open

## 2026-08-25 — Woordenboek-restjes: je/jouw, "Attitude", "afspraak" · [ux]
- **Wat:** JOUW AFSPRAAK (2:303) / Je afspraak (2:329) / JE AFSPRAAK (50:30); "Jouw antwoord bij Attitude" (2:333) waar het domein elders "Ik werk mee in de les" heet; "afspraak" betekent het eigen plan én de schoolregel (D-kaart "Ik volg de afspraken" 2:173; chip "afspraak niet nagekomen" 50:51 op 09). Overal "je"; 07 "Je antwoord bij 'Ik werk mee in de les'"; D-kaart "Ik hou me aan de regels".
- **Waarom niet nu:** P3-8 — copy, zichtbaar in de PDF maar geen frictie.
- **Eerste zet:** vier tekstnodes; D-kaart of chip hernoemen.
- **Status:** open

## 2026-08-25 — Zero-states en de gate "Verder pas na alle antwoorden" · [ux]
- **Wat:** 02/03/05/06 tonen alleen de ingevulde staat; CTA's zonder disabled-variant; nergens staat dat "Verder" wacht op de drie vragen en de gok ("weet ik niet" telt). Doelstelling 1 hangt aan die gate. Eén regel per caption of op de cover; optioneel één frame 02-leeg.
- **Waarom niet nu:** P3-9 — `[GEEN DATA]` over het beoogde gedrag; wireframe-stadium.
- **Eerste zet:** cover-regel "Verder is uitgeschakeld tot alle vragen beantwoord zijn".
- **Deels gebouwd 2026-09-02:** op 02 staat de poort nu als regel op het scherm ("Je gok kan pas als de drie vragen beantwoord zijn — en brengt je meteen verder"). Nog open: 03, 05 en 06 tonen alleen de ingevulde staat, en er is nergens een disabled-variant getekend.
- **Status:** open

## 2026-08-25 — Seintje-kanaal en de twee check-momenten · [ux]
- **Wat:** 08 "Over 2 weken. Je krijgt een seintje." zonder kanaal (Smartschool-bericht? push?); 01 "check op 15 januari" (≈8 weken na november) past in geen van de twee chips van 06 (over 2 weken / volgende periode); twee events zonder semantiek. Kanaal als hypothese benoemen; datum op 01 laten kloppen met het chip-model; optioneel een klein frame "Twee weken later. Lukt het?".
- **Waarom niet nu:** P3-10 — analyse M9 besliste "niet bijtekenen"; alleen het kanaal en de datum zijn nieuw.
- **Eerste zet:** 50:28 "een bericht in Smartschool" (hypothese) en 2:20 "check: volgende periode".
- **Status:** open

## 2026-08-25 — Captions: acceptatie-item "≤ 2 zinnen" bijstellen; drie stellige claims · [ux]
- **Wat:** captions 09 (2:396) en 10 (2:617) hebben drie zinnen — de derde is de hypothese-markering en leest goed; het item hoort "≤ 2 zinnen + optionele hypothese-markering" te zijn. Drie claims zonder bron: caption 01 "dat niemand herleest", 06 "dat 'ik ga beter mijn best doen' oplevert", 07 "dan vult de leerling strategisch in" — verzachten naar hypothese-vorm.
- **Waarom niet nu:** P3-11 — de briefing zelf stelt "elke stelling is een hypothese"; kleine copy.
- **Eerste zet:** briefing-item herformuleren; 2:32, 2:315, 2:353 verzachten.
- **Status:** open

## 2026-08-25 — 10 klassenraad: per-rij status, toon van de prompt, drempel chip→B · [ux]
- **Wat:** "18 / 21 bevestigd" zonder zichtbare rij-status; prompt 2:554 "Gedrag kan een leerling veranderen, een eigenschap niet." leest als les aan leerkrachten; "De scores staan al ingevuld uit de observaties" zonder drempelregel. Vinkje/"open" per rij; prompt als hulp ("Kies wat de leerling kan veranderen"); één regel "drempel chip→B: instelbaar, hier ≥3 per periode".
- **Waarom niet nu:** P3-12 — sectie 2 is hypothese en wordt in de video niet getoond.
- **Eerste zet:** rij Amine B. markeren als "open"; 2:554 herschrijven.
- **Status:** open

## 2026-08-25 — "9:41" als Apple-tell · [ux]
- **Wat:** negen statusbalken tonen 9:41; verder is de balk geneutraliseerd. Eén find-replace naar 10:12, of de balk weglaten (chromebook heeft er geen).
- **Waarom niet nu:** P3-13 — nice-to-have.
- **Eerste zet:** find-replace over 2:7, 2:35, 2:115, 2:156, 2:225, 2:284, 2:318, 50:13, 2:356.
- **Status:** open

## 2026-08-25 — Inleverchecklist: bestandsnaam, PDF-route, cover als eerste pagina · [ux]
- **Wat:** `figma.root.name` is nog "Soda+" (briefing-item open, handmatig); de PDF hoort per section geëxporteerd (cover, Sectie 1, Sectie 2) — "Export frames to PDF" maakt vermoedelijk 21 pagina's afwisselend scherm/caption-sliver `[aanname]`; de cover 1740×330 rendert in een PDF als een strook kleine tekst — overweeg 1740×900 met de uitsnede van het oude rapport en de doelstellingen erbij (zie rapport §7.3).
- **Waarom niet nu:** P3-14 — procesadvies vóór een stap die de briefing al als open item draagt.
- **Eerste zet:** hernoemen; sections selecteren → Export → PDF; output controleren in een privévenster.
- **Status:** open

## 2026-08-25 — Micro-toets op de kwaliteit van het plan (06) · [ux]
- **Wat:** 06 toetst alleen of de slots gevuld zijn. Eén regel onder de samenvattingskaart: "Hoe vaak gebeurt de ALS per week?" (elke les / soms / zelden) — "zelden" triggert "Kies een moment dat vaker voorkomt". Toetst kwaliteit zonder tekst.
- **Waarom niet nu:** P3-15 — idee voor een extra prikkel, geen gebroken gedrag; doelstelling 3 is al gedragen via terugkeer en slots.
- **Eerste zet:** één chip-rij tekenen onder 2:302 en in de video als "met meer tijd" noemen.
- **Status:** open

## 2026-08-25 — Frequentie-antwoorden (02) één keer laten terugkomen · [ux]
- **Wat:** de drie frequentie-antwoorden per domein voeden geen later scherm; hun functie is de zelfevaluatie zelf (doelstelling 1) en de opstap naar de gok. Eén echo waar het het gesprek helpt: 03 openen met "Je zei: huiswerk bijna nooit", of op 04 de eigen frequentie onder "Jij en de school zien hetzelfde".
- **Waarom niet nu:** P3-16 — privé-tenzij-gedeeld is een bewuste default; schrappen zou doelstelling 1 uithollen.
- **Eerste zet:** één regel op 03 (2:128) als context.
- **Status:** open

## 2026-08-25 — "Dit delen we niet" als default labelen, niet als feit · [ux]
- **Wat:** 03 "Dit delen we niet." en 07 "WAT WE NIET DELEN" staan als feit terwijl cover-vraag 3 inzage openlaat en het script waarschuwt tegen "dit blijft van de leerling" als belofte. Eén caption-zin: "Default: privé tot de leerling deelt — instelbaar per school; wie het uiteindelijk ziet is vraag 3 op de cover."
- **Waarom niet nu:** P3-17 — kleine contradictie, verdedigbaar als "default, instelbaar"; dat staat er alleen niet.
- **Eerste zet:** caption 03 (2:153) of 07 (2:353) uitbreiden.
- **Status:** open

## 2026-08-25 — Wat mevr. Devos krijgt: knoplabel-echo → gesprekszin · [ux]
- **Wat:** 07 deelt "Jouw antwoord bij Attitude: Dit had ik niet gezien." — een knoplabel dat de titularis niet zegt of de leerling de observatie aanvaardt of er geen weet van had. Herformuleren als gesprekszin: "Bij 'meewerken in de les': dit had ik niet gezien — bespreek welke lessen." (De grotere gaten — 01-antwoord, S/O-werkpunten — zijn F13/F1 in het rapport.)
- **Waarom niet nu:** P3-18 — titulariszijde is bewust niet getekend (briefing beslissing 3); dit is copy.
- **Eerste zet:** tekst 2:334 herschrijven.
- **Status:** open

## 2026-08-25 — soda-plus opnemen in de laag-discipline-guard · [infra]
- **Wat:** `packages/tokens/scripts/guard.mjs` kent alleen cashflow, jobradar en portfolio als scope; `apps/soda-plus` valt buiten de guard op primitives, rauwe paletklassen en kale hex. De app gebruikt de gedeelde rollaag (`@umanex/config/tailwind/preset`), dus hij hoort in dezelfde lijst.
- **Waarom niet nu:** raakt `packages/tokens` (cross-app scope, `chore(tokens):`) en hoort niet in de PR die de scaffold en de docs binnenbrengt; de ESLint-laag (`@umanex/config/eslint/tokens`) dekt intussen de editor.
- **Eerste zet:** `apps/soda-plus` toevoegen aan de scope-lijst (regel ~37) en de app-lus (regel ~111) in `guard.mjs`; `pnpm --filter @umanex/tokens guard` moet groen blijven en op één ingeplante `bg-green-500` in `apps/soda-plus/app/page.tsx` rood worden (tegenproef).
- **Status:** open

## 2026-09-02 — CTA's staan op zeven hoogtes; geen sticky CTA-zone · [ux]
- **Wat:** F3 uit `audits/2026-08-25-ux-audit-wireframes.md` — gemeten CTA-top varieert van y=458 (08) tot y=746 (05), spreiding 288 px, en op 05 valt de knop in de 34 px-zone onderaan. Audit §7.4 stelt één sticky zone y=727–778 op alle schermen voor. Dit item stond in de 05b-briefing als "blijft in de backlog" maar is daar nooit geland — deze entry sluit dat gat.
- **Waarom niet nu:** de kleur-, maat- en F9-ronde van vandaag raakte alleen tekst en één knopstijl; CTA's op één hoogte pinnen verschuift op zeven schermen de compositie, en 05 heeft na de feedbackronde nog 4 px speling onderaan. Dat is een eigen ronde, geen bijvangst.
- **Eerste zet:** per scherm de body op `primaryAxisAlignItems: SPACE_BETWEEN` zetten met een vaste CTA-zone onderaan; beginnen bij 08 (y=458, de grootste afwijker) en 05 (y=746) en meten of de content ertussen past.
- **Status:** open

## 2026-09-02 — Videoscript loopt achter op het board na de feedbackronde · [docs]
- **Wat:** `video/2026-08-25-videoscript.md` noemt Sectie 2 als "00, 04b en 08b" (05c ontbreekt), zegt niets over de auto-advance op 02, en de omvang-beat op 2:45 draagt het nu/later-onderscheid nog niet dat wél op de cover staat. Het script staat bovendien op 686 woorden tegen een doel van ±4 minuten — er moet dus vervangen worden, niet toegevoegd.
- **Waarom niet nu:** de opdracht van vandaag was "verwerk je voorstellen in de wireframes in Figma". Gesproken tekst is Jeroens tekst; die herschrijf ik niet ongevraagd, en de acceptatie-regel over de scriptlengte in de 05b-briefing zegt hetzelfde.
- **Eerste zet:** één zin in de flow-beat over 02 ("de gok is meteen de knop verder"), de sectie-2-opsomming aanvullen met 05c, en de omvang-beat vervangen door de twee cover-blokken in eigen woorden.
- **Gebouwd 2026-09-02:** `video/2026-09-02-videoscript.md` — 688 woorden gemeten (5:06 bij 135 wpm, 4:35 bij 150), met 05c en de auto-advance erin en een eigen beat over de werkwijze. v1 staat gemarkeerd als vervangen. Wat openblijft: de opname zelf, en de keuze of de aanpak-beat erin blijft (zin 6 van de zeven-zinnen-toets).
- **Status:** gebouwd
