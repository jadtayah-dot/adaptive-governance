import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Suspense } from 'react'

import CorpusBrowser from './corpus-browser'
import type { CorpusRecord } from './types'

export const metadata = {
  title: 'Corpus',
  description: 'The systematic review corpus, filterable and citable.',
}

// Read at build time rather than importing the JSON, so TypeScript does not have
// to infer a literal type for 217 records with 29 fields each.
function loadCorpus(): CorpusRecord[] {
  const file = path.join(process.cwd(), 'content', 'corpus.json')
  return JSON.parse(readFileSync(file, 'utf8')) as CorpusRecord[]
}

export default function CorpusPage() {
  const records = loadCorpus()

  return (
    <Suspense fallback={<p className="p-4">Loading the corpus.</p>}>
      <CorpusBrowser records={records} />
    </Suspense>
  )
}
