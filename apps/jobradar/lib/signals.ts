import type { RawJob, RawLead } from './sources/types'
import { matchedSkills, normaliseerBedrijf } from './matching'
import {
  DESIGN_SKILLS,
  DEV_SKILLS,
  SIGNAL_THRESHOLDS,
  AFGELEIDE_SIGNALEN,
  type AfgeleidSignaal,
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

/**
 * Deelt één vacature in als design-werk, dev-werk, of geen van beide.
 *
 * "Geen van beide" is een echte uitkomst en geen restcategorie: Adzuna's `what_or` is los,
 * dus een query op "designer" levert ook Mechanical Designers. Die tellen nergens in mee.
 */
function classificeer(job: Pick<RawJob, 'title' | 'description'>): 'design' | 'dev' | null {
  const skills = matchedSkills(job)
  if (skills.some((s) => DESIGN_SKILLS.includes(s))) return 'design'
  if (skills.some((s) => DEV_SKILLS.includes(s))) return 'dev'
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
      if (isRecent(job.postedAt, nu, SIGNAL_THRESHOLDS.groeiVensterDagen)) recent++
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
  const uniek = [...new Set([...vreemd, ...afgeleid])]

  // Vreemde signalen alfabetisch, afgeleide in hun vaste volgorde erachter.
  return uniek.sort((a, b) => {
    const ia = AFGELEIDE_SIGNALEN.indexOf(a as AfgeleidSignaal)
    const ib = AFGELEIDE_SIGNALEN.indexOf(b as AfgeleidSignaal)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'nl')
    if (ia === -1) return -1
    if (ib === -1) return 1
    return ia - ib
  })
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
    }))
}
