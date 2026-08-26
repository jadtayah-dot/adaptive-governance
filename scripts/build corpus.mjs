// Builds the published corpus from the screening export and the country mapping.
//
//   node "scripts/build corpus.mjs"
//
// Reads:
//   content/corpus.csv           the screening export, one row per analysed record
//   content/country mapping.csv  hand resolved geography, one row per distinct mapping
//
// Writes:
//   content/corpus.json            the published records
//   content/corpus by country.json counts, derived from corpus.json so the two cannot disagree
//   content/corpus summary.json    the five fields the homepage list shows, and nothing else
//   content/country names.json     alpha 3 to the name the globe draws, for the country index
//
// Two source columns never reach the output. Both carry verbatim publisher text:
//   Key quotation(s) + page no.
//   Definition of adaptive governance (with page no.)

import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import topology from 'world-atlas/countries-110m.json' with { type: 'json' }

import { ISO_NUMERIC_TO_ALPHA3 } from '../lib/iso-numeric-to-alpha3.ts'

const CORPUS_CSV = 'content/corpus.csv'
const MAPPING_CSV = 'content/country mapping.csv'
const OUT_CORPUS = 'content/corpus.json'
const OUT_COUNTS = 'content/corpus by country.json'
const OUT_SUMMARY = 'content/corpus summary.json'
const OUT_NAMES = 'content/country names.json'

/*
  The homepage carries the corpus now, so the records ship to the browser rather
  than being read at build time the way /corpus reads them. The full set is
  nearly half a megabyte across twenty nine fields, which is not something to
  put in front of a reviewer on a slow connection for a list that shows five of
  them. This is those five, derived from the same records, so the summary and
  the full page cannot disagree.
*/
const SUMMARY_FIELDS = ['id', 'title', 'authors', 'year', 'countries', 'url']

// Columns that must never be carried into the output, matched on the source header.
const BANNED_COLUMNS = [
  'Key quotation(s) + page no.',
  'Definition of adaptive governance (with page no.)',
]

/** RFC 4180 parser. Handles quoted fields, embedded commas, newlines and doubled quotes. */
function parseCsv(text) {
  const src = text.replace(/^﻿/, '')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else { quoted = false }
      } else field += c
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\r') {
      // handled by the newline that follows
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

/**
 * Splits a citation into authors and year.
 * Fragments that are nothing but initials belong to the author before them,
 * so "Al-Battat, K. R., Iyer, S. S., & Raji, B." yields three authors, not six.
 */
function parseCitation(citation) {
  const raw = String(citation ?? '').trim()
  const yearMatch = raw.match(/\((\d{4})(\s*\/\s*(\d{4}))?[a-z]?\)/)
  const year = yearMatch ? Number(yearMatch[1]) : null
  const ambiguousYear = Boolean(yearMatch && yearMatch[3])

  let names = yearMatch ? raw.slice(0, yearMatch.index) : raw
  // Trailing separators go, but a trailing period does not: it belongs to the
  // last author's initial, as in "Raji, B."
  names = names.replace(/[\s,;&]+$/, '').replace(/\s*&\s*/g, ',').replace(/\s+and\s+/g, ',')

  const isInitials = (s) => /^(?:[A-Z]\.?\s*){1,4}$/.test(s.trim())
  const authors = []
  for (const part of names.split(',')) {
    const piece = part.trim()
    if (piece === '') continue
    if (isInitials(piece) && authors.length) authors[authors.length - 1] += `, ${piece}`
    else authors.push(piece)
  }
  return { authors, year, ambiguousYear }
}

/** Splits the DOI/URL column into a doi and a resolvable url. */
function parseIdentifier(value) {
  const raw = String(value ?? '').trim()
  if (raw === '' || /^not reported$/i.test(raw)) return { doi: '', url: '', resolved: false }
  const doiMatch = raw.match(/\b(10\.\d{4,9}\/\S+)/)
  if (doiMatch) {
    const doi = doiMatch[1].replace(/[.,;)\]]+$/, '')
    return { doi, url: `https://doi.org/${doi}`, resolved: true }
  }
  if (/^https?:\/\//i.test(raw)) return { doi: '', url: raw, resolved: true }
  return { doi: '', url: '', resolved: false }
}

// ---------------------------------------------------------------- mapping

const mappingRows = parseCsv(readFileSync(MAPPING_CSV, 'utf8')).filter((r) => r.length > 1)
const mappingHeader = mappingRows.shift()
const mIdx = (name) => {
  const i = mappingHeader.findIndex((h) => h.trim().toLowerCase() === name)
  if (i < 0) throw new Error(`country mapping is missing the "${name}" column`)
  return i
}
const M_VALUE = mIdx('original value')
const M_ISO = mIdx('iso codes')
const M_SCALE = mIdx('scale')

const VALID_SCALES = new Set(['national', 'subnational', 'transboundary', 'regional', 'global', 'conceptual'])

const geography = new Map()
for (const row of mappingRows) {
  const codes = row[M_ISO].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  const scale = row[M_SCALE].trim().toLowerCase()
  if (scale !== '' && !VALID_SCALES.has(scale)) {
    throw new Error(`country mapping has an unknown scale "${scale}" on row: ${row[M_VALUE].slice(0, 60)}`)
  }
  for (const code of codes) {
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new Error(`country mapping has a malformed ISO code "${code}" on row: ${row[M_VALUE].slice(0, 60)}`)
    }
  }
  // One row can cover several original strings, folded with a vertical bar.
  for (const key of row[M_VALUE].split('|').map((s) => s.trim())) {
    if (key === '') continue
    geography.set(key, { countries: codes, scale })
  }
}

// ---------------------------------------------------------------- corpus

const corpusRows = parseCsv(readFileSync(CORPUS_CSV, 'utf8')).filter((r) => r.some((c) => c.trim() !== ''))
const header = corpusRows.shift().map((h) => h.trim())

const col = (name) => {
  const i = header.findIndex((h) => h === name)
  if (i < 0) throw new Error(`corpus.csv is missing the "${name}" column`)
  return i
}

for (const banned of BANNED_COLUMNS) {
  if (!header.includes(banned)) {
    console.warn(`  note: expected banned column "${banned}" is not present in the export`)
  }
}

const C = {
  id: col('Paper ID'),
  citation: col('Citation (Author, Year)'),
  title: col('Title'),
  identifier: col('DOI/URL'),
  geography: col('Geographical variable'),
  sector: col('Sector / policy domain'),
  method: col('Research design & method'),
  unitOfAnalysis: col('Unit of analysis'),
  framework: col('Primary theoretical framework(s)'),
  normativeStance: col('Normative stance toward AG'),
  enablers: col('Enablers of AG'),
  challenges: col('Challenges of AG'),
  evidenceInPractice: col('Evidence of AG in practice'),
  indicators: col('Indicators / operationalizations'),
  powerPolitics: col('Engagement with power & politics'),
  equity: col('Engagement with equity / justice / legitimacy'),
  mechanisms: col('Mechanisms of AG'),
  institutionalEnablers: col('Institutional conditions enabling AG'),
  institutionalConstraints: col('Institutional conditions constraining AG'),
  relatedConcepts: col('Relationship with related concepts'),
  distinguishedFrom: col('How AG is distinguished from related concepts'),
  level: col('Level of governance'),
  evidenceType: col('Type of evidence supporting AG claims'),
  note: col('Notes / Coding comments'),
}

const bannedIndexes = new Set(BANNED_COLUMNS.map((b) => header.indexOf(b)).filter((i) => i >= 0))
for (const [field, index] of Object.entries(C)) {
  if (bannedIndexes.has(index)) throw new Error(`field "${field}" points at a banned column`)
}

const text = (row, index) => String(row[index] ?? '').trim()

const records = []
const yearFailures = []
const identifierFailures = []
const unmappedGeography = []

for (const row of corpusRows) {
  const id = text(row, C.id)
  if (id === '') continue

  const { authors, year, ambiguousYear } = parseCitation(row[C.citation])
  if (year === null) yearFailures.push({ id, citation: text(row, C.citation), reason: 'no year found' })
  else if (ambiguousYear) yearFailures.push({ id, citation: text(row, C.citation), reason: `two years given, took ${year}` })

  const identifier = parseIdentifier(row[C.identifier])
  if (!identifier.resolved) identifierFailures.push({ id, value: text(row, C.identifier) })

  const label = text(row, C.geography)
  const key = label === '' ? `(blank) Paper ID ${id}` : label
  const geo = geography.get(key)
  if (!geo) {
    unmappedGeography.push({ id, label: key })
    continue
  }

  records.push({
    id,
    title: text(row, C.title),
    authors,
    year,
    doi: identifier.doi,
    url: identifier.url,
    countries: geo.countries,
    geographicScale: geo.scale,
    geographicLabel: label,
    sector: text(row, C.sector),
    method: text(row, C.method),
    unitOfAnalysis: text(row, C.unitOfAnalysis),
    level: text(row, C.level),
    normativeStance: text(row, C.normativeStance),
    framework: text(row, C.framework),
    enablers: text(row, C.enablers),
    challenges: text(row, C.challenges),
    evidenceInPractice: text(row, C.evidenceInPractice),
    indicators: text(row, C.indicators),
    mechanisms: text(row, C.mechanisms),
    institutionalEnablers: text(row, C.institutionalEnablers),
    institutionalConstraints: text(row, C.institutionalConstraints),
    powerPolitics: text(row, C.powerPolitics),
    equity: text(row, C.equity),
    relatedConcepts: text(row, C.relatedConcepts),
    distinguishedFrom: text(row, C.distinguishedFrom),
    evidenceType: text(row, C.evidenceType),
    note: text(row, C.note),
    status: 'included',
  })
}

if (unmappedGeography.length) {
  console.error(`\n${unmappedGeography.length} record(s) have a geography value with no row in the country mapping:`)
  for (const u of unmappedGeography) console.error(`  Paper ID ${u.id}: ${JSON.stringify(u.label)}`)
  console.error('\nAdd them to content/country mapping.csv and run again. Nothing was written.')
  process.exit(1)
}

records.sort((a, b) => Number(a.id) - Number(b.id))

// -------------------------------------------------- derive counts from records

const byCountry = {}
let withoutCountry = 0
const withoutCountryByScale = {}

for (const record of records) {
  if (record.countries.length === 0) {
    withoutCountry += 1
    const scale = record.geographicScale || 'unspecified'
    withoutCountryByScale[scale] = (withoutCountryByScale[scale] ?? 0) + 1
    continue
  }
  for (const code of record.countries) byCountry[code] = (byCountry[code] ?? 0) + 1
}

const sortedByCountry = Object.fromEntries(
  Object.entries(byCountry).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
)

const counts = {
  byCountry: sortedByCountry,
  withoutCountry: { total: withoutCountry, byScale: withoutCountryByScale },
  totals: {
    records: records.length,
    recordsWithAtLeastOneCountry: records.length - withoutCountry,
    distinctCountries: Object.keys(byCountry).length,
    countryMentions: Object.values(byCountry).reduce((n, v) => n + v, 0),
  },
}

writeFileSync(OUT_CORPUS, JSON.stringify(records, null, 2) + '\n', 'utf8')
writeFileSync(OUT_COUNTS, JSON.stringify(counts, null, 2) + '\n', 'utf8')

// Only the records the homepage list can show. A record with no country can
// never be reached by selecting a country, so it is not carried.
const summary = records
  .filter((r) => r.countries.length > 0)
  .map((r) => Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, r[f]])))
writeFileSync(OUT_SUMMARY, JSON.stringify(summary) + '\n', 'utf8')

/*
  Country names for the index beside the globe, taken from the same world-atlas
  polygons the globe draws, so a name in the list and a name in the tooltip are
  the same string. Written out here rather than looked up in the browser: the
  boundary data is a hundred kilobytes and the index needs sixty six names.
*/
const collection = feature(topology, topology.objects.countries)
const countryNames = {}
for (const f of collection.features) {
  const code = ISO_NUMERIC_TO_ALPHA3[String(Number(f.id))]
  if (code && counts.byCountry[code] > 0) {
    countryNames[code] = String(f.properties.name ?? code)
  }
}
writeFileSync(OUT_NAMES, JSON.stringify(countryNames, null, 2) + '\n', 'utf8')

// ---------------------------------------------------------------- report

const withCountry = records.length - withoutCountry
const top = Object.entries(sortedByCountry).slice(0, 15)

console.log('')
console.log(`  ${OUT_CORPUS}`)
console.log(`  ${OUT_COUNTS}`)
console.log(`  ${OUT_SUMMARY}`)
console.log(`  ${OUT_NAMES}`)
console.log('')
console.log(`  total records                  ${records.length}`)
console.log(`  with at least one country      ${withCountry}`)
console.log(`  with no country                ${withoutCountry}`)
console.log(`  distinct countries             ${counts.totals.distinctCountries}`)
console.log(`  country mentions               ${counts.totals.countryMentions}`)
console.log('')
console.log('  records with no country, by scale')
for (const [scale, n] of Object.entries(withoutCountryByScale).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${scale.padEnd(14)} ${n}`)
}
console.log('')
console.log('  top fifteen countries')
for (const [code, n] of top) console.log(`    ${code}  ${n}`)

if (yearFailures.length) {
  console.log('')
  console.log(`  year needs checking on ${yearFailures.length} record(s)`)
  for (const f of yearFailures) console.log(`    Paper ID ${f.id}: ${f.reason} in ${JSON.stringify(f.citation)}`)
} else {
  console.log('')
  console.log('  year parsed on every record')
}

if (identifierFailures.length) {
  console.log('')
  console.log(`  no resolvable DOI or URL on ${identifierFailures.length} record(s)`)
  for (const f of identifierFailures) console.log(`    Paper ID ${f.id}: ${JSON.stringify(f.value)}`)
}

console.log('')
