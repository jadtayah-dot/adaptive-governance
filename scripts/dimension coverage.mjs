// Measures the four derived breakdowns on /corpus against the published records.
//
//   node "scripts/dimension coverage.mjs"
//   node "scripts/dimension coverage.mjs --residue"   also prints the raw text
//                                                     of every unclassified record
//
// Only normativeStance is a coded vocabulary. level, method and sector are free
// text with close to one distinct value per record, so lib/corpus-dimensions.ts
// groups them by rule. This prints how much of the corpus each rule set reaches
// and how many buckets each record lands in, so the grouping is judged on
// numbers rather than on how the panels happen to look.
//
// tests/corpus.py asserts the thresholds. This script is for reading the shape
// and for looking at what did not match.

import { readFileSync } from 'node:fs'

import { DIMENSIONS, UNCLASSIFIED } from '../lib/corpus-dimensions.ts'

const records = JSON.parse(readFileSync('content/corpus.json', 'utf8'))
const showResidue = process.argv.includes('--residue')

const SOURCE_FIELD = {
  stance: 'normativeStance',
  level: 'level',
  method: 'method',
  sector: 'sector',
}

console.log('')
console.log(`${records.length} records`)

for (const dimension of DIMENSIONS) {
  const counts = new Map(dimension.buckets.map((b) => [b.key, 0]))
  const perRecord = []
  const residue = []

  for (const record of records) {
    const keys = dimension.classify(record)
    perRecord.push(keys.length)
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
    if (keys.includes(UNCLASSIFIED)) residue.push(record)
  }

  const unclassified = counts.get(UNCLASSIFIED) ?? 0
  const share = (unclassified / records.length) * 100
  const mentions = perRecord.reduce((a, b) => a + b, 0)
  const mean = mentions / records.length

  console.log('')
  console.log(`=== ${dimension.label}  (from ${SOURCE_FIELD[dimension.key]}) ===`)
  console.log(
    `  ${dimension.buckets.length - 1} buckets, ` +
      `${unclassified} unclassified (${share.toFixed(1)}%), ` +
      `${mentions} bucket mentions, ${mean.toFixed(2)} per record`
  )

  const rows = dimension.buckets
    .map((b) => [b.label, counts.get(b.key) ?? 0])
    .sort((a, b) => b[1] - a[1])
  for (const [label, n] of rows) {
    const width = Math.round((n / records.length) * 40)
    console.log(`  ${String(n).padStart(4)}  ${'#'.repeat(width).padEnd(40)}  ${label}`)
  }

  const empty = rows.filter(([, n]) => n === 0).map(([label]) => label)
  if (empty.length > 0) console.log(`  empty buckets: ${empty.join(', ')}`)

  if (showResidue && residue.length > 0) {
    console.log(`  --- unclassified text ---`)
    for (const record of residue) {
      console.log(`  ${record.id}  ${JSON.stringify(record[SOURCE_FIELD[dimension.key]])}`)
    }
  }
}

console.log('')
