/**
 * Invarianten op het ondernemingsnummer en de harde website-verificatie.
 *
 * De nummers in deze suite zijn niet verzonnen maar uit de KBO-dump van extract 429 gehaald,
 * en met opzet gekozen op hun randgeval. Drie ervan hebben een controlegetal van 97 — de
 * gevallen waarop een naïeve `% 97` stukgaat en die op de echte dump 4.078 van de 400.000
 * ondernemingen betroffen. Drie andere hebben het nieuwere prefix 1.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/ondernemingsnummer-scenarios.ts
 */
import {
  isGeldigOndernemingsnummer,
  vindOndernemingsnummers,
  bevestigtPagina,
  formatteer,
  isGidsUrl,
} from '../lib/sources/ondernemingsnummer'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── De controlesom, op echte nummers uit de dump ─────────────────────────────

/** Controlegetal exact 97: de eerste acht cijfers zijn deelbaar door 97. De valkuil. */
const CONTROLE_97 = ['0203884397', '0206677997', '0207201797']
/** Het nieuwere prefix 1. */
const PREFIX_1 = ['1000000120', '1000000219', '1000000615']
/** Gewone nummers met prefix 0. */
const GEWOON = ['0200065765', '0200068636', '0200171970']

for (const n of CONTROLE_97) {
  check(`controlegetal 97 wordt aanvaard: ${n}`, isGeldigOndernemingsnummer(n))
}
for (const n of PREFIX_1) {
  check(`prefix 1 wordt aanvaard: ${n}`, isGeldigOndernemingsnummer(n))
}
for (const n of GEWOON) {
  check(`gewoon nummer wordt aanvaard: ${n}`, isGeldigOndernemingsnummer(n))
}

// Negatieve controle: één cijfer wijzigen moet de som breken, anders meet de check niets.
for (const n of [...GEWOON, ...CONTROLE_97]) {
  const stuk = n.slice(0, 3) + String((Number(n[3]) + 1) % 10) + n.slice(4)
  check(`één cijfer wijzigen breekt de som: ${n} -> ${stuk}`, !isGeldigOndernemingsnummer(stuk))
}

check('negen cijfers is geen nummer', !isGeldigOndernemingsnummer('020006576'))
check('elf cijfers is geen nummer', !isGeldigOndernemingsnummer('02000657650'))
check('prefix 2 is een vestigingseenheid, geen onderneming', !isGeldigOndernemingsnummer('2200065765'))
check('lege invoer', !isGeldigOndernemingsnummer(''))
check('tekst', !isGeldigOndernemingsnummer('geen nummer'))

check('formatteren', formatteer('0200065765') === '0200.065.765', formatteer('0200065765'))

// ── Schrijfwijzen in het wild ────────────────────────────────────────────────

const SCHRIJFWIJZEN = [
  '0200.065.765',
  '0200065765',
  '0200 065 765',
  'BE 0200.065.765',
  'BE0200065765',
  'BE-0200.065.765',
  'btw BE 0200.065.765',
  'Ondernemingsnummer: 0200.065.765.',
]
for (const vorm of SCHRIJFWIJZEN) {
  check(`herkent "${vorm}"`, vindOndernemingsnummers(vorm).includes('0200065765'), vindOndernemingsnummers(vorm).join(','))
}

check(
  'vindt er twee op één pagina',
  vindOndernemingsnummers('BE 0200.065.765 en 0203.884.397').length === 2
)

// Grensgevallen: een langer cijferblok mag geen nummer opleveren.
check(
  'geen treffer binnen een langer getal',
  vindOndernemingsnummers('12020006576500').length === 0,
  vindOndernemingsnummers('12020006576500').join(',')
)
check('geen treffer op een willekeurige reeks', vindOndernemingsnummers('0000000000').length === 0)

// ── De bevestiging ───────────────────────────────────────────────────────────

{
  const pagina = 'Contact — Voorbeeld BV, Kouter 1, 9000 Gent. BTW BE 0200.065.765. Tel 09 123 45 67.'
  const goed = bevestigtPagina(pagina, '0200065765')
  check('pagina met het juiste nummer bevestigt', goed.bevestigd && goed.reden === 'gevonden', goed.reden)

  const fout = bevestigtPagina(pagina, '0203884397')
  check('pagina met een ANDER nummer bevestigt niet', !fout.bevestigd, fout.reden)
  check('en meldt welk nummer er wél stond', fout.andereNummers.includes('0200065765'), fout.andereNummers.join(','))
  check('reden is niet-op-pagina', fout.reden === 'niet-op-pagina', fout.reden)

  const leeg = bevestigtPagina('Welkom op onze website. Bel ons op 050 12 34 56.', '0200065765')
  check('pagina zonder nummers', !leeg.bevestigd && leeg.reden === 'geen-nummers-op-pagina', leeg.reden)

  const ongeldig = bevestigtPagina(pagina, '1234567890')
  check('ongeldig verwacht nummer is een programmeerfout, geen pagina-uitspraak', ongeldig.reden === 'nummer-ongeldig', ongeldig.reden)

  // De opmaak op de pagina mag niet uitmaken; het nummer wel.
  check('bevestigt ook bij aaneengeschreven vorm', bevestigtPagina('BE0200065765', '0200.065.765').bevestigd)
}

// ── Gidsen uitsluiten ────────────────────────────────────────────────────────

for (const u of [
  'https://www.linkedin.com/company/voorbeeld',
  'https://trendstop.knack.be/nl/detail/0200065765',
  'https://www.companyweb.be/nl/0200065765',
  'https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html',
  'https://nl.wikipedia.org/wiki/Voorbeeld',
  'facebook.com/voorbeeld',
]) {
  check(`gids uitgesloten: ${u.slice(8, 40)}`, isGidsUrl(u), u)
}
for (const u of ['https://www.voorbeeld.be', 'https://voorbeeld.be/contact', 'voorbeeld.be']) {
  check(`echte site niet uitgesloten: ${u}`, !isGidsUrl(u), u)
}
check('onparseerbare URL is geen gids', !isGidsUrl('niet eens een url met spaties'))
// Het gevaarlijkste geval expliciet: een gids DRAAGT het ondernemingsnummer, dus de harde
// verificatie zou hem bevestigen. Alleen de host-uitsluiting houdt hem tegen.
check(
  'een gidspagina zou de verificatie halen — en wordt daarom op de host uitgesloten',
  bevestigtPagina('Trends Top — Voorbeeld BV — 0200.065.765', '0200065765').bevestigd &&
    isGidsUrl('https://trendstop.knack.be/nl/detail/0200065765')
)

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
