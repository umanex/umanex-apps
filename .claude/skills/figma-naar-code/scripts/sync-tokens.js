#!/usr/bin/env node
/**
 * sync-tokens.js
 * Genereert skills/figma-naar-code/references/token-mapping.md + token-mapping.json vanuit tokens.json
 * De .json is het machine-diffbare doel voor de Beoordeel/verify-as van de triade (jq-baar, programmatisch diff-baar).
 *
 * Gebruik: node skills/figma-naar-code/scripts/sync-tokens.js [tokens-path] [output-path] [project-name]
 * Of via env: TOKENS_PATH=... OUTPUT_PATH=... PROJECT_NAME=... node skills/figma-naar-code/scripts/sync-tokens.js
 * Of via package.json: "sync:tokens": "node skills/figma-naar-code/scripts/sync-tokens.js"
 */

const fs = require('fs')
const path = require('path')

const TOKENS_PATH = process.env.TOKENS_PATH || process.argv[2]
const OUTPUT_PATH = process.env.OUTPUT_PATH || process.argv[3] || path.resolve(__dirname, '../references/token-mapping.md')
const PROJECT_NAME = process.env.PROJECT_NAME || process.argv[4] || path.basename(process.cwd())

if (!TOKENS_PATH) {
  console.error('✗ Geef TOKENS_PATH op via env of als eerste argument')
  process.exit(1)
}

let tokens
try {
  tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'))
} catch (err) {
  console.error(`✗ Kan tokens niet lezen of parsen: ${TOKENS_PATH}\n  ${err.message}`)
  process.exit(1)
}

// Flatten geneste token structuur naar { 'primitives/color/neutral/900': '#000000' }
// Sleutels bevatten de top-level groepnaam (primitives/, semantic/, components/)
function flatten(obj, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue
    const fullKey = prefix ? `${prefix}/${key}` : key
    // DTCG (`$value`) is de standaard; classic Tokens Studio (`value`) wordt gelezen zodat
    // een classic export niet stil nul tokens oplevert — de nul-guard onderaan zou dat wel
    // vangen, maar dan had je alsnog een onnodig gefaalde build in plaats van een mapping.
    if (value && typeof value === 'object' && value.$value !== undefined) {
      result[fullKey] = value.$value
    } else if (value && typeof value === 'object' && value.value !== undefined
               && typeof value.value !== 'object') {
      result[fullKey] = value.value
    } else if (value && typeof value === 'object') {
      Object.assign(result, flatten(value, fullKey))
    }
  }
  return result
}

const flat = flatten(tokens)

// Format shadow object als CSS box-shadow string
function formatShadow(shadow) {
  if (typeof shadow === 'object' && shadow !== null && 'color' in shadow) {
    // DTCG noemt deze velden offsetX/offsetY; classic Tokens Studio x/y. Alleen de classic
    // namen lezen gaf letterlijk "undefinedpx undefinedpx ..." in de output — mét een
    // geslaagde exit, precies de stille-undefined die CLAUDE.md bij DTCG beschrijft.
    //
    // `px` wordt alleen toegevoegd als de waarde er nog geen eenheid heeft: een DTCG-
    // dimensie is vaak al "2px" en werd anders "2pxpx".
    const unit = (v) => {
      if (v === undefined || v === null) return '0'
      const t = String(v).trim()
      return /^-?[\d.]+$/.test(t) ? `${t}px` : t
    }
    const x = shadow.offsetX ?? shadow.x
    const y = shadow.offsetY ?? shadow.y
    return `${unit(x)} ${unit(y)} ${unit(shadow.blur)} ${unit(shadow.spread)} ${shadow.color}`
  }
  return JSON.stringify(shadow)
}

// Format typography object, lost interne referenties op
function formatTypography(typo, flatMap) {
  if (typeof typo !== 'object' || typo === null) return String(typo)
  const r = (v) => resolveValue(v, flatMap)
  const parts = []
  if (typo.fontFamily) parts.push(r(typo.fontFamily))
  if (typo.fontWeight) parts.push(r(typo.fontWeight))
  if (typo.fontSize) parts.push(`${r(typo.fontSize)}px`)
  if (typo.lineHeight) parts.push(`/ ${r(typo.lineHeight)}`)
  const td = typo.textDecoration ? r(typo.textDecoration) : null
  if (td && td !== 'none') parts.push(td)
  return parts.join(' ')
}

// Los een waarde op: vervangt {x.y.z} referenties recursief (max depth 5)
// Probeert prefixes: primitives/, semantic/, components/
function resolveValue(value, flatMap, depth = 0) {
  if (depth > 5) return value

  if (typeof value === 'string' && /^\{.+\}$/.test(value)) {
    const refPath = value.slice(1, -1).replace(/\./g, '/')
    // Eerst het pad zoals het er staat: een referentie kán al absoluut zijn
    // ({primitives.color.neutral.900}). Zonder deze regel viel zo'n verwijzing door alle
    // prefixes heen en belandde de rauwe accolade-string in de output.
    if (flatMap[refPath] !== undefined) {
      return resolveValue(flatMap[refPath], flatMap, depth + 1)
    }
    for (const prefix of ['primitives', 'semantic', 'components']) {
      const candidate = `${prefix}/${refPath}`
      if (flatMap[candidate] !== undefined) {
        return resolveValue(flatMap[candidate], flatMap, depth + 1)
      }
    }
    return value // onoplosbaar, geef terug as-is
  }

  if (typeof value === 'object' && value !== null) {
    // Herken een shadow aan zijn vórm, niet aan een `type`-veld. In DTCG staat `$type` op
    // de ouder en niet ín `$value`, dus de oude toets (`'type' in value`) sloeg nooit aan
    // en de shadow belandde als rauwe JSON in de mapping.
    const looksLikeShadow = 'color' in value &&
      ['offsetX', 'offsetY', 'x', 'y', 'blur', 'spread'].some((k) => k in value)
    if (looksLikeShadow) return formatShadow(value)
    if ('fontFamily' in value || 'fontSize' in value) return formatTypography(value, flatMap)
    return JSON.stringify(value)
  }

  return value
}

// Los alle flat waarden op
const resolved = {}
for (const [key, value] of Object.entries(flat)) {
  resolved[key] = resolveValue(value, flat)
}

// Bepaal de categorie van een token-pad (herbruikt door de tabel-groepering én de JSON-emit)
function categoryOf(key) {
  if (key.includes('/color/') || key.startsWith('color')) return 'color'
  if (key.includes('/typography/') || key.startsWith('typography')) return 'typography'
  if (key.includes('/spacing/') || key.startsWith('spacing')) return 'spacing'
  if (key.includes('/radius/') || key.startsWith('radius')) return 'radius'
  if (key.includes('/shadow/') || key.startsWith('shadow')) return 'shadow'
  return 'other'
}

// Groepeer per categorie
const groups = {
  color: {},
  typography: {},
  spacing: {},
  radius: {},
  shadow: {},
  other: {},
}

for (const [key, value] of Object.entries(resolved)) {
  groups[categoryOf(key)][key] = value
}

// Genereer markdown tabel
function toTable(group, title) {
  const entries = Object.entries(group)
  if (entries.length === 0) return ''
  let md = `## ${title}\n\n`
  md += `| Token | Waarde |\n|---|---|\n`
  for (const [key, value] of entries) {
    const cssVar = `--${key.replace(/\//g, '-')}`
    md += `| \`${cssVar}\` | \`${value}\` |\n`
  }
  return md + '\n'
}

// Bouw het volledige markdown bestand
const now = new Date().toISOString().split('T')[0]
let output = `# Token Mapping — ${PROJECT_NAME}

> Automatisch gegenereerd op ${now} vanuit \`${TOKENS_PATH}\`
> Niet manueel aanpassen — run \`npm run sync:tokens\` om te updaten.

## CSS variabelen syntax

\`var(--primitives-color-neutral-900)\` · \`var(--semantic-color-text-primary)\` · \`var(--components-button-fill-background-default)\`

Prefixes: \`--primitives-*\` · \`--semantic-*\` · \`--components-*\` (separator: \`-\`, niet \`/\`)

Gebruik altijd CSS variabelen met hex fallback:
\`\`\`tsx
// ✅ Correct
sx={{ color: 'var(--semantic-color-text-primary, #000)' }}

// ❌ Fout
sx={{ color: '#393E46' }}
\`\`\`

`

output += toTable(groups.color, 'Kleuren')
output += toTable(groups.typography, 'Typography')
output += toTable(groups.spacing, 'Spacing')
output += toTable(groups.radius, 'Border radius')
output += toTable(groups.shadow, 'Shadows')

if (Object.keys(groups.other).length > 0) {
  output += toTable(groups.other, 'Overige tokens')
}

// Nul tokens betekent dat het parsen mislukt is, niet dat er niets te mappen valt.
// Doorschrijven wiste dan een correcte mapping en meldde "✅ bijgewerkt (0 tokens)" met
// exit 0, waarna `sync:tokens && ...`-ketens en CI de wipe als geslaagd behandelden.
// Hard falen dus, mét de vermoedelijke oorzaak erbij.
if (Object.keys(resolved).length === 0) {
  console.error('✗ Nul tokens uit ' + TOKENS_PATH + ' — er is niets weggeschreven.')
  console.error('  Waarschijnlijke oorzaak: het bestand is geen geldige token-boom, of elke')
  console.error('  leaf mist zowel `$value` (W3C DTCG) als `value` (Tokens Studio classic).')
  console.error('  Controleer de export-instelling "Convert to W3C DTCG format".')
  process.exit(1)
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
fs.writeFileSync(OUTPUT_PATH, output, 'utf-8')

console.log(`✅ token-mapping.md bijgewerkt (${Object.keys(resolved).length} tokens)`)
console.log(`   → ${OUTPUT_PATH}`)

// Dual-emit: machine-diffbare JSON (token-pad → cssVar + opgeloste waarde + categorie).
// Dit is het jq-bare, programmatisch diff-bare doel dat de markdown-tabel niet kan zijn —
// het geeft de Beoordeel/verify-as van de triade eindelijk een echt toetsbaar target.
const JSON_OUTPUT_PATH = process.env.JSON_OUTPUT_PATH ||
  (OUTPUT_PATH.endsWith('.md') ? OUTPUT_PATH.replace(/\.md$/, '.json') : OUTPUT_PATH + '.json')
const tokensObj = {}
for (const [key, value] of Object.entries(resolved)) {
  tokensObj[key] = { cssVar: `--${key.replace(/\//g, '-')}`, value, category: categoryOf(key) }
}
const jsonDoc = {
  project: PROJECT_NAME,
  generatedAt: now,
  source: TOKENS_PATH,
  tokenCount: Object.keys(resolved).length,
  tokens: tokensObj,
}
fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(jsonDoc, null, 2) + '\n', 'utf-8')
console.log(`✅ token-mapping.json bijgewerkt`)
console.log(`   → ${JSON_OUTPUT_PATH}`)
