// Converts the screening export workbook to content/corpus.csv.
//
// The export arrived as an xlsx. Everything downstream reads CSV, so this runs
// once per new export and then gets out of the way. No dependencies: an xlsx is
// a zip of XML, and Node can read both.
//
//   node "scripts/xlsx to csv.mjs" "content/corpus csv.xlsx" content/corpus.csv

import { readFileSync, writeFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

const [inPath, outPath] = process.argv.slice(2)
if (!inPath || !outPath) {
  console.error('usage: node "scripts/xlsx to csv.mjs" <workbook.xlsx> <out.csv>')
  process.exit(1)
}

/** Minimal zip reader. Returns a Map of entry name to Buffer. */
function unzip(buf) {
  const EOCD_SIG = 0x06054b50
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not a zip archive: no end of central directory')

  const entryCount = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const files = new Map()

  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry')
    const method = buf.readUInt16LE(p + 10)
    const compressedSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`bad local header for ${name}`)
    const lNameLen = buf.readUInt16LE(localOffset + 26)
    const lExtraLen = buf.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(start, start + compressedSize)

    if (method === 0) files.set(name, Buffer.from(raw))
    else if (method === 8) files.set(name, inflateRawSync(raw))
    else throw new Error(`unsupported compression method ${method} for ${name}`)

    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const decodeEntities = (s) =>
  s.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
   .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
   .replace(/&amp;/g, '&')

const columnIndex = (ref) => {
  const letters = ref.match(/^[A-Z]+/)[0]
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const files = unzip(readFileSync(inPath))

const sharedXml = files.get('xl/sharedStrings.xml')
const shared = []
if (sharedXml) {
  for (const si of sharedXml.toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = ''
    for (const t of si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1]
    shared.push(decodeEntities(text))
  }
}

const sheetName = [...files.keys()].find((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
if (!sheetName) throw new Error('no worksheet found in workbook')
const sheet = files.get(sheetName).toString('utf8')

const rows = []
let width = 0
for (const rm of sheet.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = []
  for (const cm of rm[2].matchAll(/<c[^>]*?r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
    const i = columnIndex(cm[1])
    const type = (cm[2].match(/t="([^"]+)"/) || [])[1]
    const body = cm[3]
    let value = ''
    if (type === 's') {
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1]
      value = v != null ? shared[Number(v)] : ''
    } else if (type === 'inlineStr') {
      let text = ''
      for (const t of body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1]
      value = decodeEntities(text)
    } else {
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1]
      value = v != null ? decodeEntities(v) : ''
    }
    cells[i] = value
  }
  if (cells.length > width) width = cells.length
  rows.push(cells)
}

const quote = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
const lines = rows.map((cells) => {
  const padded = []
  for (let i = 0; i < width; i++) padded.push(quote(cells[i] ?? ''))
  return padded.join(',')
})

// Byte order mark so the accented place names survive a double click into Excel.
writeFileSync(outPath, '﻿' + lines.join('\r\n') + '\r\n', 'utf8')

console.log(`${inPath} -> ${outPath}`)
console.log(`  ${rows.length - 1} data rows, ${width} columns`)
