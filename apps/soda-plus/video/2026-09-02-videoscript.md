# Videoscript — praktijkopdracht SODAplus (v2, aanpak-frame)

Vervangt `video/2026-08-25-videoscript.md`. Twee dingen zijn anders: het board is bijgewerkt na de
feedbackronde van 2026-09-02 (05c, auto-advance op 02, het nu/later-blok op de cover), en er staat
een eigen beat in over hoe dit gemaakt is — jouw oordeel tegenover AI als versneller.

Doel: 3 tot 5 minuten, één take, spreektaal. Structuur volgt de mail van Simon: wat je maakte →
welke problemen en kansen → waarom die keuzes → hoe verder met meer tijd. Beeld: Figma in
Present-mode voor de flow (startpunt "Leerlingflow"), uitgezoomd board voor scope, cover voor het slot.

**Lengte — gemeten, niet geschat: 688 woorden spreektekst.** Dat is 5:06 bij 135 woorden per minuut
en 4:35 bij 150, het tempo dat je in een opname makkelijk haalt. Beide zitten binnen de 3 à 5 minuten.
Wil je marge, dan zijn dit de snijlijnen, in volgorde van minste schade:

| Weg | Bespaart | Kost je |
|---|---|---|
| Flow-regel **07** | 13 w | de privacy-preview; die zit verder nergens |
| Doelstelling 3 (de terugkeer) | 17 w | het antwoord op "écht nadenken" — zwaarste verlies |
| Tweede alinea van "Wat dag één al werkt" (05c) | 33 w | het bewijs bij het budget-argument |
| De hele aanpak-beat | 160 w | waar deze versie voor gemaakt is |

De telling zit in `python3`-vorm onderaan dit bestand, zodat je hem na elke edit opnieuw kan draaien —
schattingen liepen hier eerder 28 % mis. Pauzes zijn gemarkeerd met —.

---

## 0:00 – 0:20 · Opening
**Beeld:** cover, of jij in beeld.

> Dag Simon, dag team. Dit is mijn voorstel voor het digitale attituderapport, en waarom ik het zo gemaakt heb. Ik begin bij het papieren rapport — daar zit het hele ontwerp in.

## 0:20 – 0:55 · Het probleem
**Beeld:** het oude rapport, ingezoomd op de drie lege kaders.

> Hier staat het kader "Oplossing voor de B-scores volgens de leerling" drie periodes op rij leeg. Ik lees daar drie oorzaken in. — Eén: de feedback zegt "niet gemotiveerd". Dat is een oordeel over wie je bent, en daar maak je geen plan tegen. Twee: het kader vraagt schrijven, terwijl kiezen zou volstaan — zeker bij een leerling die Nederlands nog leert. Drie: niemand komt er de volgende periode op terug. — Die drie bepalen het ontwerp.

## 0:55 – 2:00 · De flow
**Beeld:** Present-mode, 01 → 08. Eén zin per scherm, klik terwijl je spreekt.

> **01** — De periode opent niet met je score, maar met je afspraak van vorige keer. Gelukt? "Niet gelukt" mag — dan maken we ze kleiner.
>
> **02** — De zelfcheck, per domein. Niet "ben je ordelijk", wel drie dingen die je kan zien: had ik mijn cursus mee, maakte ik mijn huiswerk. Dan pas de gok: wat gaf de school?
>
> **04** — Dan de school. Hier draait het om: we beginnen bij waar jullie het eens zijn. Het verschil staat afgedekt onderaan, en de leerling opent het zelf.
>
> **05** — Daar staat wat de leerkracht telde, apart van wat ze erbij dacht. De leerling mag antwoorden — ook "ik zie het anders".
>
> **05b** — De leerling kiest zelf zijn werkpunt. Het systeem kiest niet voor hem.
>
> **06** — Het plan bouw je uit stukken: als dit gebeurt, dan doe ik dat, en die helpt me.
>
> **07** — Vóór het delen zie je wat de titularis krijgt, en wat niet.
>
> **08** — Het eindigt op een datum: het gesprek, en de check over twee weken. Daar begint de volgende periode.

## 2:00 – 2:50 · De drie doelstellingen, met wat ik verwierp
**Beeld:** blijf op 04 (doelstelling 1), 03 + 06 (doelstelling 2), 01 (doelstelling 3).

> **Doelstelling één**, eerst zelfevaluatie. "Aantrekkelijk" heb ik gelezen als kort en niet bedreigend, niet als kleurrijk. Badges en streaks heb ik verworpen: bij vier momenten per jaar kan een streak alleen breken, en een leerling met B als norm staat laatste op een scorebord.
>
> **Doelstelling twee**, bij een verwachte B een oplossing. Die had ik eerst letterlijk gebouwd: het plan vóór de score. Maar blijkt het een A, dan was die stap nepwerk. Vandaar 03 en 06: de oorzaak ervoor, het plan erna.
>
> **Doelstelling drie**, écht nadenken. Geen beloning, maar een terugkeer: elke afspraak krijgt een datum, en de volgende periode opent ermee.

## 2:50 – 3:35 · Hoe dit gemaakt is
**Beeld:** board uitgezoomd — sectie 1 en 2 zichtbaar. Sectie 3 niet openen.

> Nu hoe dit gemaakt is. De opdracht zegt maximaal een uur. Dat uur is in de beslissingen gaan zitten, niet in het tekenen — dat deed ik met AI-tooling in Figma. Wat je in sectie twee en drie ziet, is wat ik daarna nog heb doorgedacht; dat reken ik er niet bij.
>
> Wat ik zelf deed, is alles wat je me net hoorde verdedigen: dat een A of een B abstract is en gedrag concreet moet, en dat een tiener die nog Nederlands leert dichtklapt als je opent met het verschil — dus open je met waar jullie het eens zijn. — Wat AI deed: varianten op formuleringen, de schermstructuur uittekenen, meedenken over randgevallen. "Weet ik niet" als volwaardig antwoord komt uit zo'n ronde.
>
> AI kent een OKAN-klas niet uit zichzelf. Ik heb de randvoorwaarden aangeleverd en het grootste deel weggegooid — de badges van daarnet zijn er één van. — Dat is ook wat je koopt bij een halve dag per week: niet meer handen, wel snelle uitvoering op keuzes die doordacht zijn.

## 3:35 – 4:10 · Wat dag één al werkt
**Beeld:** cover, de twee onderste blokken.

> Op de cover staat wat dag één al werkt zónder koppeling: de hele leerlingflow. En wat er wél een koppeling voor vraagt — de tellingen per les, de stiptheid, en de vooringevulde klassenraad. Drie dingen, als hypothese.
>
> Ik heb het getekend ook: 05c is scherm 05 zonder koppeling, met alleen de zin uit de klassenraad. Werkt de flow dan nog? Ja. Waar de school al observaties heeft, wordt hij scherper.

## 4:10 – 4:45 · Met meer tijd, en drie vragen
**Beeld:** cover, rechterkolom.

> Met meer tijd zou ik vijf leerlingen laten doorklikken, op gsm en op chromebook. Ik tel dertien schermen — of dat er te veel zijn weet ik niet; dat staat als aanname op de cover. En ik zou twee klassen buiten OKAN bekijken.
>
> Drie vragen bepalen hoe dit verder gaat: leeft dit in Smartschool of in jullie platform? Is OKAN typerend, of één school van de 58? En wie ziet de zelfinschatting? — Twintig minuten samen kijken lijkt me de snelste manier. Bedankt.

---

## Zeven zinnen die je zonder papier moet kunnen zeggen

Kan je er één niet in eigen woorden brengen, dan gaat dat stuk uit de video — niet omdat het fout is, maar omdat je het in het gesprek erna niet kan verdedigen.

1. Waarom het kader leeg blijft — de drie oorzaken.
2. Waarom drie gedragingen met een frequentie beter zijn dan "ben je ordelijk, A of B".
3. Waarom de onthulling opent op overeenstemming en niet op het verschil in het rood.
4. Waarom het plan ná de onthulling staat en niet ervoor.
5. Waarom geen badges of streaks.
6. **Welke beslissing in dit ontwerp je zonder AI ook genomen zou hebben — en welke niet.** Dit is de vraag die achter de aanpak-beat komt. Kan je hem niet beantwoorden, laat de beat dan weg.
7. Waarom de leerlingflow op zichzelf staat en de schoolzijde een hypothese is.

## Wat je niet zegt

- **Niet "ik heb dit in een uur gemaakt".** Het board draagt een revisieronde, een audit en twee bijstelrondes; die claim breekt bij één doorvraag. De formulering hierboven — het uur zat in de beslissingen, de rest staat apart op het board — is wat wél standhoudt. Zie `audits/2026-08-25-analyse-gedane-werk.md` §6.
- **Niet "AI heeft het gemaakt" en ook niet "AI heeft geholpen met wat details".** Het eerste geeft je werk weg, het tweede is niet waar en klinkt zo. De verdeling die je uitspreekt — beslissingen van jou, uitvoering versneld — is de enige die je bij doorvragen kan tonen.
- Geen cijfers zonder bron: geen "een klassenraad doet twintig leerlingen in anderhalf uur", geen effectgroottes, geen percentages.
- Geen namen van studies. "Een plan uit stukken werkt beter dan een leeg vak" mag je zeggen; een auteursnaam niet, tenzij je hem gelezen hebt.
- Niet "dit blijft van de leerling" als belofte — wel "de leerling kiest wat gedeeld wordt; wie het uiteindelijk ziet, is aan jullie".
- Geen "umanex".

## Opname

- Eén take. Verspreek je je: herbegin de zin, knip niet. Een haperende zin die van jou is, is beter dan een gladde die het niet is.
- Figma Present-mode op "Leerlingflow"; zet de opname vooraf op 02 klaar zodat de eerste klik meteen beeld geeft.
- Toon het oude rapport uit de opdracht-PDF (pagina 2) bij het probleem — hun eigen bewijsstuk, niet jouw slide.
- Sectie 3 blijft dicht. Sectie 2 (00, 04b, 08b en 05c) mag in beeld bij het uitzoomen.
- De aanpak-beat spreek je bij voorkeur in beeld, niet over een screenshot. Het is het enige stuk dat over jou gaat.
- Unlisted link (YouTube/Vimeo/Loom) die zonder account opent. Test in een privévenster.

## Pakket, indienen ±5 september

1. Videolink
2. Figma-viewlink — "iedereen met de link kan bekijken", bestand hernoemd naar "SODAplus — attituderapport (praktijkopdracht)"
3. PDF-export van het board
4. In de mail: drie zinnen — wat het is, dat de video de toelichting is, en het aanbod van de korte online meeting die in de opdracht staat.

---

## De lengte narekenen

Na elke wijziging in de spreektekst opnieuw draaien; een schatting is hier twee keer fout gebleken.

```bash
python3 - <<'EOF'
import re, pathlib
regels = [l[2:] for l in pathlib.Path('video/2026-09-02-videoscript.md').read_text().splitlines() if l.startswith('> ')]
t = re.sub(r'\*\*\d+b?\*\*\s*—\s*', '', ' '.join(regels))
t = re.sub(r'\*\*|—|·', ' ', t)
w = len([x for x in re.split(r'\s+', t) if re.search(r'[A-Za-zÀ-ÿ0-9]', x)])
print(w, 'woorden ->', f'{int(w/135)}:{round(w/135%1*60):02d}', 'bij 135 wpm |', f'{int(w/150)}:{round(w/150%1*60):02d}', 'bij 150')
EOF
```
