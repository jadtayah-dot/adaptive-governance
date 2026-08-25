export type GeographicScale =
  | 'national'
  | 'subnational'
  | 'transboundary'
  | 'regional'
  | 'global'
  | 'conceptual'
  | ''

export type CorpusRecord = {
  id: string
  title: string
  authors: string[]
  year: number | null
  doi: string
  url: string
  countries: string[]
  geographicScale: GeographicScale
  geographicLabel: string
  sector: string
  method: string
  unitOfAnalysis: string
  level: string
  normativeStance: string
  framework: string
  enablers: string
  challenges: string
  evidenceInPractice: string
  indicators: string
  mechanisms: string
  institutionalEnablers: string
  institutionalConstraints: string
  powerPolitics: string
  equity: string
  relatedConcepts: string
  distinguishedFrom: string
  evidenceType: string
  note: string
  status: 'included'
}

/** Field order used by the detail panel. Every field on the record appears here. */
export const FIELD_LABELS: { key: keyof CorpusRecord; label: string }[] = [
  { key: 'id', label: 'Paper ID' },
  { key: 'title', label: 'Title' },
  { key: 'authors', label: 'Authors' },
  { key: 'year', label: 'Year' },
  { key: 'doi', label: 'DOI' },
  { key: 'url', label: 'Link' },
  { key: 'countries', label: 'Countries' },
  { key: 'geographicScale', label: 'Geographic scale' },
  { key: 'geographicLabel', label: 'Geographic label as recorded' },
  { key: 'sector', label: 'Sector or policy domain' },
  { key: 'method', label: 'Research design and method' },
  { key: 'unitOfAnalysis', label: 'Unit of analysis' },
  { key: 'level', label: 'Level of governance' },
  { key: 'normativeStance', label: 'Normative stance' },
  { key: 'framework', label: 'Primary theoretical framework' },
  { key: 'enablers', label: 'Enablers' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'evidenceInPractice', label: 'Evidence in practice' },
  { key: 'indicators', label: 'Indicators and operationalizations' },
  { key: 'mechanisms', label: 'Mechanisms' },
  { key: 'institutionalEnablers', label: 'Institutional conditions enabling' },
  { key: 'institutionalConstraints', label: 'Institutional conditions constraining' },
  { key: 'powerPolitics', label: 'Engagement with power and politics' },
  { key: 'equity', label: 'Engagement with equity, justice, legitimacy' },
  { key: 'relatedConcepts', label: 'Relationship with related concepts' },
  { key: 'distinguishedFrom', label: 'How it is distinguished from related concepts' },
  { key: 'evidenceType', label: 'Type of evidence' },
  { key: 'note', label: 'Screening note' },
  { key: 'status', label: 'Status' },
]
