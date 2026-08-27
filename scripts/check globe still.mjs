/*
  Fails the build when the corpus has moved on and the globe still has not.

  Below MIN_LIVE_WIDTH, and under prefers reduced motion, the site does not run
  the live scene. It serves three frames of it instead, so a narrow reader and a
  wide reader see two renderings of the same data. If the corpus is rebuilt and
  nobody re runs the capture, those two quietly disagree, and a site read by
  grant reviewers is showing one set of numbers as a picture and another as a
  table. Nothing about that failure is visible, which is why it is wired to the
  build.

  The frame ids are read out of lib/globe-sequence.ts rather than listed here,
  so adding a frame there is enough: this starts requiring it immediately, and
  the build fails until it has been rendered.

  Hashes, not modification times. git does not preserve mtimes, so on a fresh
  clone every file carries its checkout time in whatever order the checkout
  happened to run, and a timestamp comparison would fail or pass at random.

  Run by `prebuild`, so `npm run build` cannot skip it.
*/

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STAMP = join(ROOT, 'scripts', 'globe still.stamp.json')
const SEQUENCE = join(ROOT, 'lib', 'globe-sequence.ts')
const REGENERATE = 'npm run dev, then: python "scripts/globe still.py"'

/*
  Hashes the content, with line endings normalised first.

  git checks these files out with CRLF on a machine configured for Windows and
  with LF everywhere else, so hashing the raw bytes makes the answer depend on
  who cloned the repository rather than on whether the corpus changed. That is
  how this check came to fail on a fresh clone while passing in the tree it was
  written in.
*/
async function sha256(path) {
  const text = await readFile(path, 'utf8')
  return createHash('sha256').update(text.split('\r\n').join('\n')).digest('hex')
}

function fail(lines) {
  console.error('\nglobe still is out of date\n')
  for (const line of lines) console.error(`  ${line}`)
  console.error(`\n  regenerate it with:\n    ${REGENERATE}\n`)
  process.exit(1)
}

async function main() {
  let stamp
  try {
    stamp = JSON.parse(await readFile(STAMP, 'utf8'))
  } catch {
    fail([`no stamp at scripts/globe still.stamp.json, so the still cannot be checked`])
  }

  /*
    Which frames there are supposed to be, from the one place that decides.
  */
  let ids = []
  try {
    const src = await readFile(SEQUENCE, 'utf8')
    const block = src.match(/STILL_FRAMES\s*=\s*\[([\s\S]*?)\n\]/)
    ids = [...(block?.[1] ?? '').matchAll(/id:\s*'([a-z]+)'/g)].map((m) => m[1])
  } catch {
    fail(['could not read lib/globe-sequence.ts to find out which frames to expect'])
  }
  if (ids.length === 0) {
    fail(['STILL_FRAMES in lib/globe-sequence.ts parsed as empty'])
  }

  const missing = []
  for (const id of ids) {
    try {
      await readFile(join(ROOT, 'public', `globe-still-${id}.png`))
    } catch {
      missing.push(`public/globe-still-${id}.png is missing`)
    }
  }
  if (missing.length) fail(missing)

  /*
    A frame added to the sequence but never rendered would otherwise pass on the
    hashes alone, because the corpus has not moved. The stamp records which
    frames the capture wrote, and this is where the two lists are compared.
  */
  const stamped = stamp.frames ?? []
  const unstamped = ids.filter((id) => !stamped.includes(id))
  if (unstamped.length) {
    fail([
      `the stamp does not cover ${unstamped.join(', ')}`,
      'so those frames were never rendered by the capture that wrote it',
    ])
  }

  try {
    await readFile(join(ROOT, 'public', `globe-still-${ids[0]}.png`))
  } catch {
    fail([`public/globe-still-${ids[0]}.png is missing`])
  }

  const stale = []
  for (const [rel, recorded] of Object.entries(stamp.sources ?? {})) {
    let current
    try {
      current = await sha256(join(ROOT, rel))
    } catch {
      stale.push(`${rel} is missing, but the still was rendered from it`)
      continue
    }
    if (current !== recorded) {
      stale.push(`${rel} has changed since the still was rendered`)
    }
  }

  if (stale.length) fail(stale)
  console.log('globe still matches the corpus it was rendered from')
}

await main()
