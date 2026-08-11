import type { RawJob, RawLead } from './sources/types'
import { matchedSkills, normaliseerBedrijf } from './matching'
import {
  DESIGN_SKILLS,
  DEV_SKILLS,
  DESIGN_ROLE_SUFFIXEN,
  DEV_ROLE_SUFFIXEN,
  DESIGN_ROLE_FRASES,
  DEV_ROLE_FRASES,
  SIGNAL_THRESHOLDS,
  AFGELEIDE_SIGNALEN,
  type AfgeleidSignaal,
  type SkillKey,
} from './config/profile'
import { ALL_REGIONS, type RegionCode } from './regions'

/** Waar een afgeleide lead vandaan komt. Onderscheidt hem van een KBO- of fixture-lead. */
export const AFGELEIDE_BRON = 'vacatures'

export type Bedrijfsprofiel = {
  bedrijfssleutel: string
  companyName: string
  region: RegionCode
  postcode: number
  designVacatures: number
  devVacatures: number
  recenteVacatures: number
  totaalVacatures: number
  signals: AfgeleidSignaal[]
}

function tel(skills: readonly SkillKey[], set: readonly SkillKey[]): number {
  return skills.filter((s) => set.includes(s)).length
}

/**
 * De rol die de titel noemt, of `null` als hij er geen noemt.
 *
 * Kijkt uitsluitend naar rolwoorden — wát iemand is — en nooit naar vaardigheden. "UI
 * Developer" is een developer; dat er "UI" voor staat maakt het geen designvacature.
 *
 * Woorden worden op *suffix* getoetst, want Nederlands stapelt: "Webdesigner" en
 * "Softwareontwikkelaar" bevatten hun rolwoord zonder woordgrens ervoor.
 */
export function rolInTitel(title: string): 'design' | 'dev' | null {
  const laag = title.toLowerCase()
  const woorden = laag.split(/[^a-zà-ÿ]+/).filter(Boolean)

  const heeft = (suffixen: readonly string[], frases: readonly string[]) =>
    frases.some((f) => laag.includes(f)) || woorden.some((w) => suffixen.some((s) => w.endsWith(s)))

  const design = heeft(DESIGN_ROLE_SUFFIXEN, DESIGN_ROLE_FRASES)
  const dev = heeft(DEV_ROLE_SUFFIXEN, DEV_ROLE_FRASES)

  // Beide genoemd ("Designer / Developer"): design wint. Een vals "design" kost een lead,
  // een vals "dev" stuurt je naar een bedrijf dat net een designer aanwierf — duurder.
  if (design) return 'design'
  if (dev) return 'dev'
  return null
}

/**
 * Deelt één vacature in als design-werk, dev-werk, of geen van beide.
 *
 * **De rol komt uit de titel, de relevantie uit de vaardigheden.** Die scheiding is de hele
 * les van twee mislukte reviewrondes (`LEARNINGS.md`, 2026-08-10). Eerst won design altijd
 * omdat het als eerste getest werd; na de correctie won dev altijd, omdat 10 van 13
 * gangbare designtitels geen enkel *skill*-woord bevatten en de omschrijving het dan
 * overnam — waarna één stack-zin een Visual Designer tot dev-vacature maakte. Een
 * skill-lijst kan de rolvraag niet beantwoorden; elke bijstelling verplaatst de fout.
 *
 * Nu:
 *   1. de titel noemt de rol — of hij noemt er geen, en dan raden we niet;
 *   2. de vaardigheden bepalen alleen óf de vacature in Jeroens vakgebied ligt.
 *
 * Punt 2 vangt wat punt 1 te ruim laat: "Mechanical Designer" is een designer-rol, maar
 * zonder één relevante vaardigheid telt hij nergens mee. Adzuna's `what_or` is los, dus die
 * vacatures komen echt binnen.
 *
 * Noemt de titel geen rol, dan mag een ondubbelzinnig *skill*-signaal ín de titel het nog
 * beslissen ("Stagiaire Web-Front, UX/UI Design"). De omschrijving beslist nooit over de
 * rol — dat is precies het pad waarlangs het twee keer misging.
 */
export function classificeer(job: Pick<RawJob, 'title' | 'description'>): 'design' | 'dev' | null {
  // Buiten het vakgebied telt niets, welke rol de titel ook noemt.
  if (matchedSkills(job).length === 0) return null

  const rol = rolInTitel(job.title)
  if (rol) return rol

  const titelSkills = matchedSkills({ title: job.title, description: '' })
  const design = tel(titelSkills, DESIGN_SKILLS)
  const dev = tel(titelSkills, DEV_SKILLS)
  if (design > 0 && dev === 0) return 'design'
  if (dev > 0 && design === 0) return 'dev'
  return null
}

/** De vaakst voorkomende waarde, met een deterministische tiebreak op de meegegeven volgorde. */
function meestVoorkomend<T>(waarden: T[], volgorde: readonly T[]): T | undefined {
  const telling = new Map<T, number>()
  for (const w of waarden) telling.set(w, (telling.get(w) ?? 0) + 1)

  let beste: T | undefined
  let besteAantal = -1
  for (const kandidaat of volgorde) {
    const aantal = telling.get(kandidaat) ?? 0
    if (aantal > besteAantal) {
      beste = kandidaat
      besteAantal = aantal
    }
  }
  return besteAantal > 0 ? beste : undefined
}

function isRecent(postedAt: string, nu: Date, vensterDagen: number): boolean {
  const t = Date.parse(postedAt)
  if (Number.isNaN(t)) return false
  const dagen = (nu.getTime() - t) / 86_400_000
  return dagen >= 0 && dagen <= vensterDagen
}

/**
 * Bouwt per bedrijf een profiel uit zijn vacatures.
 *
 * Alles wat hier berekend wordt komt uit *tellingen* en deterministische tiebreaks, nooit
 * uit "de eerste die ik zag". Dat is geen stijlkeuze: als de volgorde van de vacaturelijst
 * de uitkomst verandert, verandert een lead-score doordat een bron zijn paginering wijzigt.
 * De permutatie-invariant in `scripts/signal-scenarios.ts` bewaakt precies dat.
 */
export function bouwBedrijfsprofielen(jobs: RawJob[], nu: Date): Bedrijfsprofiel[] {
  const groepen = new Map<string, RawJob[]>()
  for (const job of jobs) {
    const sleutel = normaliseerBedrijf(job.company)
    if (!sleutel) continue
    const groep = groepen.get(sleutel)
    if (groep) groep.push(job)
    else groepen.set(sleutel, [job])
  }

  const profielen: Bedrijfsprofiel[] = []

  for (const [bedrijfssleutel, groep] of groepen) {
    let design = 0
    let dev = 0
    let recent = 0

    for (const job of groep) {
      const soort = classificeer(job)
      if (soort === 'design') design++
      else if (soort === 'dev') dev++
      // Alleen relevante vacatures tellen mee voor groei. Anders werd een bedrijf met drie
      // verse Mechanical Designers een lead met "recente groei" — een naam zonder aanleiding,
      // precies wat deze module hoort uit te sluiten.
      if (soort !== null && isRecent(job.postedAt, nu, SIGNAL_THRESHOLDS.groeiVensterDagen)) recent++
    }

    const relevant = design + dev
    const signals: AfgeleidSignaal[] = []
    if (design >= 1) signals.push('UX-budget aanwezig')
    if (dev >= 1 && design === 0) signals.push('dev-vacature zonder design')
    if (relevant >= SIGNAL_THRESHOLDS.productteamVacatures) signals.push('digital product team')
    if (recent >= SIGNAL_THRESHOLDS.groeiVacatures) signals.push('recente groei')

    // Vaste volgorde, zodat twee runs op dezelfde data byte-identieke JSON opleveren.
    signals.sort((a, b) => AFGELEIDE_SIGNALEN.indexOf(a) - AFGELEIDE_SIGNALEN.indexOf(b))

    const region = meestVoorkomend(groep.map((j) => j.region), ALL_REGIONS) ?? groep[0]!.region
    const postcodes = groep.map((j) => j.postcode).filter((p) => p > 0)
    const postcode = meestVoorkomend(postcodes, [...new Set(postcodes)].sort((a, b) => a - b)) ?? 0

    // Bronnen spellen dezelfde naam verschillend; de alfabetisch eerste van de vaakst
    // voorkomende schrijfwijze wint, zodat de keuze niet aan de volgorde hangt.
    const namen = groep.map((j) => j.company.trim())
    const companyName =
      meestVoorkomend(namen, [...new Set(namen)].sort((a, b) => a.localeCompare(b, 'nl'))) ??
      bedrijfssleutel

    profielen.push({
      bedrijfssleutel,
      companyName,
      region,
      postcode,
      designVacatures: design,
      devVacatures: dev,
      recenteVacatures: recent,
      totaalVacatures: groep.length,
      signals,
    })
  }

  return profielen.sort((a, b) => a.bedrijfssleutel.localeCompare(b.bedrijfssleutel, 'nl'))
}

/**
 * Legt de afgeleide signalen over de bestaande heen zonder de rest aan te raken.
 *
 * Een bedrijf kan signalen uit meerdere bronnen dragen: "series A+" komt ooit uit een
 * fundingbron, "recente groei" uit de vacatures. Een simpele vervanging wist het eerste;
 * een simpele unie laat "recente groei" eeuwig staan nadat het niet meer waar is. Daarom
 * vervangt deze functie precies de afgeleide signalen en laat ze de andere met rust — en
 * daardoor is twee keer toepassen hetzelfde als één keer.
 */
export function mergeSignalen(bestaand: readonly string[], afgeleid: readonly string[]): string[] {
  const afgeleideSet = new Set<string>(AFGELEIDE_SIGNALEN)
  const vreemd = bestaand.filter((s) => !afgeleideSet.has(s))
  return sorteerSignalen([...vreemd, ...afgeleid])
}

/**
 * Vaste volgorde en geen duplicaten: vreemde signalen alfabetisch, afgeleide in hun eigen
 * volgorde erachter.
 *
 * Hoort op élk schrijfpad te draaien, ook op de INSERT. Deed alleen de UPDATE het, dan
 * verschilde de opgeslagen JSON tussen de eerste en de tweede sync terwijl de inhoud gelijk
 * was — genoeg om een vergelijking op de rauwe kolom te laten schuiven.
 */
export function sorteerSignalen(signalen: readonly string[]): string[] {
  return [...new Set(signalen)].sort((a, b) => {
    const ia = AFGELEIDE_SIGNALEN.indexOf(a as AfgeleidSignaal)
    const ib = AFGELEIDE_SIGNALEN.indexOf(b as AfgeleidSignaal)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'nl')
    if (ia === -1) return -1
    if (ib === -1) return 1
    return ia - ib
  })
}

/**
 * De omgekeerde kant: een externe bron levert zijn eigen set en laat de afgeleide staan.
 *
 * Zonder deze functie liep de externe tak door `mergeSignalen(lead.signals, …)`, en die
 * stript per contract de afgeleide namen uit zijn *eerste* argument. KBO's signalen dragen
 * precies die namen ("recente groei", "digital product team"), dus sync 1 sloeg ze op via
 * het INSERT-pad en sync 2 wiste ze via het UPDATE-pad. Stille datavernietiging die pas bij
 * de tweede run zichtbaar werd.
 *
 * Dat twee bronnen dezelfde signaalnamen gebruiken blijft dubbelzinnig: wint de afgeleide
 * waarde of die van de bron, dan is dat een keuze en geen feit. Hier wint de bron voor zijn
 * eigen signalen, en blijft alles wat de afleiding zei staan.
 */
export function mergeBronSignalen(huidige: readonly string[], vanBron: readonly string[]): string[] {
  const afgeleideSet = new Set<string>(AFGELEIDE_SIGNALEN)
  const afgeleidBehouden = huidige.filter((s) => afgeleideSet.has(s))
  return mergeSignalen(vanBron, afgeleidBehouden)
}

/**
 * Leidt bedrijfsleads af uit de vacatures die de sync toch al ophaalde.
 *
 * Dit bestaat omdat `SIGNAL_WEIGHTS` signalen benoemt — "dev-vacature zonder design",
 * "digital product team" — die rechtstreeks uit vacaturedata volgen, terwijl ze tot nu toe
 * uitsluitend uit KBO-fixtures kwamen. De duurste bron leverde wat de goedkoopste gratis
 * afleidt, en met KBO uit de lucht bleef de leads-helft van het dashboard leeg.
 *
 * Bedrijven zonder enig signaal leveren geen lead op: een naam zonder aanleiding is ruis.
 */
export function deriveLeadsFromJobs(jobs: RawJob[], nu: Date): RawLead[] {
  return bouwBedrijfsprofielen(jobs, nu)
    .filter((p) => p.signals.length > 0)
    .map((p) => ({
      externalId: `${AFGELEIDE_BRON}:${p.bedrijfssleutel}`,
      companyName: p.companyName,
      postcode: p.postcode,
      region: p.region,
      naceCode: null,
      source: AFGELEIDE_BRON,
      signals: [...p.signals],
      // De cijfers waarop het signaal rust. Ze werden al berekend en vervolgens weggegooid;
      // zonder hen is een lead een bewering zonder bewijs (UX-audit 2026-08-11, P1).
      tellingen: { totaal: p.totaalVacatures, design: p.designVacatures, dev: p.devVacatures },
    }))
}
