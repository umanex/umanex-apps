# IJkpunten — wat een 1, 3 en 5 betekent

Alleen voor de **zes items waar iets meetbaars onder ligt**: `Accessible` uit de 7 factoren, en de vijf interactie-dimensies. De elf andere items (Useful, Usable, Findable, Credible, Desirable, Valuable, en de vijf ISO-karakteristieken) krijgen bewust géén ijkpunt — daar zou een niveau-anker valse precisie zijn, en de `bewijs:`-regel is de rem.

**Waarom dit bestaat.** Zonder ijkpunt is de 2 van vandaag niet dezelfde 2 als die van twee maanden geleden. Gemeten op lqb: `Accessible` scoorde 3 → 2 → 2 → 2 → 2 over vier audits van dezelfde flow, zonder dat iemand kan nagaan of dat een verbetering, een verslechtering of dezelfde staat anders gelezen is. Een ijkpunt maakt de Delta-stap (Procedure 1b) pas toetsbaar.

**Hoe te gebruiken.** Kies het niveau op de laagste eigenschap die je gemeten hebt, niet op het gemiddelde gevoel. 2 en 4 zijn de tussenstappen: 2 = "1, maar één van de genoemde gebreken is weg", 4 = "5, op één punt na". Elk niveau noemt een meting — kun je die meting niet doen, dan is de score geen score maar `[GEEN DATA]` of `n.v.t.`.

---

## Accessible (7 factoren)

Meet tegen de gedeclareerde norm (default WCAG 2.2 AA). Instrument: de detector-uitslag uit het `## Verify-pad`, of `figma_lint_design` aan de Figma-kant.

| Niveau | Wat je gemeten hebt |
|---|---|
| 1 | Blokkerende schendingen op het hoofdpad: contrast onder 3:1 op bodytekst, een flow die zonder muis niet af te maken is, of formuliervelden zonder toegankelijke naam. `axe serious/critical` > 0 op de hoofdroute. |
| 3 | Geen blokkades, wel structurele gaten: kopvolgorde springt, landmarks ontbreken, focusvolgorde wijkt af van de leesvolgorde, of enkele paren tussen 3:1 en 4.5:1. Met hulpmiddelen te doen, met moeite. |
| 5 | Nul `serious`/`critical` violations op alle geauditeerde routes × viewports, contrast gemeten (niet geschat) boven de norm inclusief alpha en verlopen, focus zichtbaar en logisch, en elke `incomplete` van de detector met de hand nagemeten. |

## Words

| Niveau | Wat je gemeten hebt |
|---|---|
| 1 | Labels benoemen het systeem in plaats van de taak ("submit record"); foutmeldingen noemen de oorzaak niet en de uitweg evenmin; jargon zonder uitleg op het hoofdpad. |
| 3 | Labels kloppen, maar niet consistent: twee termen voor hetzelfde begrip (meet ze — zie de cross-scherm-lens), of foutmeldingen die het probleem noemen zonder herstel. |
| 5 | Eén term per begrip over alle geauditeerde schermen (telling, verbatim strings als bewijs); elke knop noemt zijn actie; elke fout noemt probleem én herstel; de taal is die van de gebruiker, getoetst aan het klantprofiel. |

## Visual representations

| Niveau | Wat je gemeten hebt |
|---|---|
| 1 | Geen zichtbare hiërarchie — kop en body verschillen nauwelijks in grootte of gewicht; kleur draagt betekenis zonder tweede signaal; iconen uit meerdere sets of stijlen door elkaar. |
| 3 | Hiërarchie klopt op de belangrijkste schermen, maar de schaal is niet systematisch: waarden buiten de tokenschaal, of één icoonstijl met uitzonderingen. |
| 5 | Elke maat, kleur en radius komt uit een token (gemeten, niet aangenomen); betekenis nooit alleen via kleur; één icoonset in één stroke-gewicht; de consistentie-telling draagt zijn noemer. |

## Physical / space

Drempel uit de norm-input: WCAG 2.2 AA = 24×24 (SC 2.5.8); 44×44 is AAA/HIG en is advies, geen schending.

| Niveau | Wat je gemeten hebt |
|---|---|
| 1 | Interactieve elementen onder de norm op het hoofdpad, of horizontale scroll / afgeknipte inhoud op de smalste geauditeerde viewport. |
| 3 | Norm gehaald op de hoofdacties, maar niet overal: secundaire controls eronder, of layout die op één viewport zichtbaar wringt zonder te breken. |
| 5 | Elk zichtbaar interactief element gemeten (`getBoundingClientRect`, mét noemer "N gemeten") boven de norm op alle viewports; geen overloop; toetsenbord bereikt alles in leesvolgorde. |

## Time

| Niveau | Wat je gemeten hebt |
|---|---|
| 1 | Acties zonder enige feedback — de gebruiker weet na een klik niet of er iets gebeurt; of laadtijden die op de gemeten route boven enkele seconden liggen zonder indicator. |
| 3 | Feedback bestaat maar is laat of grof: een spinner midden in de content in plaats van een skeleton, of transities die merkbaar traag aanvoelen (> 400 ms op een routinehandeling). |
| 5 | Elke actie bevestigt binnen ~100 ms zichtbaar; laadtoestanden zijn skeletons op hun eigen plek; transities 150–250 ms; de laadtijd is gemeten uit het Verify-pad, niet geschat. Ontbreekt dat pad: `[NIET GEMETEN]`, geen score. |

## Behavior

| Niveau | Wat je gemeten hebt |
|---|---|
| 1 | Een actie doet iets anders dan haar label belooft, of een destructieve actie is onomkeerbaar zonder bevestiging; systeemstatus onzichtbaar. |
| 3 | Gedrag is voorspelbaar op het hoofdpad, maar toestanden ontbreken: geen lege staat, geen foutpad, of een bevestiging die niet vertelt wat er nu gebeurd is. |
| 5 | Alle zeven toestanden per interactief component aanwezig (default/hover/focus/active/disabled/loading/error — tel `n/7`, zie `operate-b2b.md`); elke actie is omkeerbaar of bevestigd; de systeemstatus is altijd zichtbaar. |
