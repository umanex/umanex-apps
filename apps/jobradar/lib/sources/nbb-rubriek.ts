/**
 * Rubriekzoeker voor de jaarrekening-JSON van de NBB Balanscentrale.
 *
 * WAAROM DIT VORMONAFHANKELIJK IS, EN NIET EEN VELDPAD
 *
 * De NBB publiceert een OpenAPI-specificatie die alléén AccountingData dekt; voor het
 * Reference-object bestaat geen publiek schema. De veldnamen die in omloop zijn komen uit een
 * demo-PPTX van december 2021, gemaakt vóór de livegang op 4 april 2022 — inclusief de
 * opvallende spelling `EntrepriseNumber`. Een parser die daarop een pad hardcodeert, geeft
 * stil `undefined` zodra één sleutel anders heet, en `undefined` ziet er identiek uit als
 * "dit bedrijf heeft geen personeel". Dat is precies de fout die je niet merkt: je filter op
 * 20-150 werknemers gooit dan de helft van je doelgroep weg zonder één foutmelding.
 *
 * Wat wél stabiel is, is het rubrieknummer. De Belgische jaarrekeningmodellen zijn genummerd
 * en die nummering verandert niet met een API-versie: rubriek 9087 is "Gemiddeld
 * personeelsbestand berekend in voltijdse equivalenten" in zowel VKT-kap als VOL-kap.
 *
 * Deze module zoekt dus op dat nummer, door de hele boom, onder elke conventie die een
 * XBRL-naar-JSON-omzetting redelijkerwijs kan gebruiken. Vindt hij niets, dan geeft hij
 * terug wélke rubrieknummers hij wél zag — zodat één blik op een echte respons volstaat om
 * te weten of het bedrijf de rubriek niet heeft of de parser hem niet herkent.
 */

/** Sleutels die in de praktijk een rubriekcode dragen, klein geschreven vergeleken. */
const CODE_SLEUTELS = ['code', 'rubric', 'rubriek', 'concept', 'name', 'id', 'tag', 'element']

/** Sleutels die in de praktijk de waarde dragen. */
const WAARDE_SLEUTELS = ['value', 'waarde', 'amount', 'val', 'v', 'number', 'decimal']

export type RubriekTreffer = {
  /** De gevonden numerieke waarde, of null wanneer de rubriek niet gevonden is. */
  waarde: number | null
  /** Waar hij hem vond — bruikbaar in een foutmelding, niet in logica. */
  pad: string | null
  /**
   * Elke rubriekcode die onderweg gezien is. Leeg betekent dat de vorm niet herkend werd;
   * gevuld zonder de gezochte code betekent dat dit bedrijf de rubriek echt niet heeft.
   * Dat onderscheid is het hele punt van dit veld.
   */
  gezieneCodes: string[]
}

/**
 * Haalt een rubriekcode uit een sleutel of waarde. `9087`, `'9087'`, `'m9087'`, `'pfs:9087'`
 * en `'rubriek_9087'` leveren allemaal `'9087'`; `'90871'` niet, want dat is een andere rubriek.
 */
function alsCode(x: unknown): string | null {
  if (typeof x === 'number' && Number.isInteger(x)) return String(x)
  if (typeof x !== 'string') return null
  const m = x.match(/(?:^|[^0-9])([0-9]{4,5})(?:$|[^0-9])/)
  return m ? m[1]! : null
}

/** Zet een waarde om naar een getal. Accepteert komma-decimalen en spaties als duizendtal. */
function alsGetal(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null
  if (typeof x !== 'string') return null
  const schoon = x.trim().replace(/\s/g, '').replace(',', '.')
  if (schoon === '') return null
  const n = Number(schoon)
  return Number.isFinite(n) ? n : null
}

/** Zoekt in een object naar de waarde die bij een rubriek hoort. */
function waardeUit(node: Record<string, unknown>): number | null {
  for (const sleutel of Object.keys(node)) {
    if (!WAARDE_SLEUTELS.includes(sleutel.toLowerCase())) continue
    const direct = alsGetal(node[sleutel])
    if (direct !== null) return direct
    // Eén laag dieper: { value: { amount: 12.5 } } komt voor in XBRL-omzettingen.
    const genest = node[sleutel]
    if (genest && typeof genest === 'object' && !Array.isArray(genest)) {
      const n = waardeUit(genest as Record<string, unknown>)
      if (n !== null) return n
    }
  }
  return null
}

/**
 * Zoekt `code` in `data` en geeft de bijbehorende numerieke waarde terug.
 *
 * Herkende vormen:
 *   { "9087": 12.5 }                       — code als sleutel
 *   { "m9087": { value: 12.5 } }           — code als sleutel met prefix
 *   { code: "9087", value: 12.5 }          — code als broer van de waarde
 *   { rubric: 9087, amount: "12,5" }       — andere sleutelnamen, komma-decimaal
 *   [ { concept: "pfs:9087", val: 12.5 } ] — in een lijst, met namespace-prefix
 */
export function vindRubriek(data: unknown, code: string): RubriekTreffer {
  const gezien = new Set<string>()
  let gevonden: { waarde: number; pad: string } | null = null

  const loop = (node: unknown, pad: string): void => {
    if (gevonden !== null || node === null || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach((kind, i) => loop(kind, `${pad}[${i}]`))
      return
    }

    const obj = node as Record<string, unknown>

    // Vorm A — de code staat in een sleutel, de waarde eronder of ernaast.
    for (const sleutel of Object.keys(obj)) {
      const c = alsCode(sleutel)
      if (c === null) continue
      gezien.add(c)
      if (c !== code) continue
      const rechtstreeks = alsGetal(obj[sleutel])
      if (rechtstreeks !== null) {
        gevonden = { waarde: rechtstreeks, pad: `${pad}.${sleutel}` }
        return
      }
      const kind = obj[sleutel]
      if (kind && typeof kind === 'object' && !Array.isArray(kind)) {
        const n = waardeUit(kind as Record<string, unknown>)
        if (n !== null) {
          gevonden = { waarde: n, pad: `${pad}.${sleutel}` }
          return
        }
      }
    }

    // Vorm B — de code staat als wáárde bij een code-sleutel, de waarde bij een waarde-sleutel.
    for (const sleutel of Object.keys(obj)) {
      if (!CODE_SLEUTELS.includes(sleutel.toLowerCase())) continue
      const c = alsCode(obj[sleutel])
      if (c === null) continue
      gezien.add(c)
      if (c !== code) continue
      const n = waardeUit(obj)
      if (n !== null) {
        gevonden = { waarde: n, pad: `${pad}.${sleutel}` }
        return
      }
    }

    for (const sleutel of Object.keys(obj)) loop(obj[sleutel], `${pad}.${sleutel}`)
  }

  loop(data, '$')

  return {
    waarde: gevonden ? (gevonden as { waarde: number }).waarde : null,
    pad: gevonden ? (gevonden as { pad: string }).pad : null,
    gezieneCodes: [...gezien].sort(),
  }
}

/** Rubriek 9087 — gemiddeld personeelsbestand in voltijdse equivalenten. */
export const RUBRIEK_PERSONEEL_VTE = '9087'

/**
 * Leest het personeelsbestand uit één accountingData-respons.
 *
 * Geeft bewust een reden terug in plaats van alleen `null`. Een ontbrekend personeelscijfer
 * heeft twee heel verschillende oorzaken — het bedrijf heeft geen sociale balans, of de parser
 * herkent de vorm niet — en die mogen niet op dezelfde manier eindigen in een filter dat
 * bedrijven op 20-150 werknemers selecteert.
 */
export function leesPersoneel(accountingData: unknown): {
  vte: number | null
  reden: 'gevonden' | 'rubriek-ontbreekt' | 'vorm-niet-herkend'
  gezieneCodes: string[]
  pad: string | null
} {
  const t = vindRubriek(accountingData, RUBRIEK_PERSONEEL_VTE)
  if (t.waarde !== null) return { vte: t.waarde, reden: 'gevonden', gezieneCodes: t.gezieneCodes, pad: t.pad }
  return {
    vte: null,
    reden: t.gezieneCodes.length === 0 ? 'vorm-niet-herkend' : 'rubriek-ontbreekt',
    gezieneCodes: t.gezieneCodes,
    pad: null,
  }
}
