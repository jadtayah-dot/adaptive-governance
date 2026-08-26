import type { CorpusRecord } from '@/app/corpus/types'

/**
 * The four breakdowns on /corpus, derived from the record fields.
 *
 * Only `normativeStance` is a coded vocabulary: 17 values across 217 records.
 * `level`, `method` and `sector` are free text extraction notes with close to
 * one distinct value per record, 193, 215 and 214 respectively. A breakdown
 * built on the raw strings would be two hundred segments of one, so each is
 * grouped here by an explicit rule over the recorded text.
 *
 * The rules are ordered lists of patterns. Every record is tested against every
 * bucket, so a record naming three levels lands in three, and a record matching
 * nothing lands in the unclassified bucket rather than disappearing. Coverage is
 * measured by `scripts/dimension coverage.mjs` and asserted by `tests/corpus.py`.
 *
 * Nothing here reads a file. The input is the published corpus and the output is
 * derived on the fly, so the grouping cannot drift from the records it groups.
 */

export type DimensionKey = 'stance' | 'level' | 'method' | 'sector'

export type Bucket = {
  /** Stable key. It goes in the URL, so it is lower case with no spaces. */
  key: string
  label: string
}

export type Dimension = {
  key: DimensionKey
  label: string
  /** The record field the grouping reads, named on the page. */
  sourceLabel: string
  /** True when one record can land in more than one bucket. */
  multi: boolean
  /**
   * Ordinal dimensions keep the order given here, because the order is part of
   * what they mean. Nominal ones are sorted by count on the page.
   */
  ordinal: boolean
  buckets: Bucket[]
  classify: (record: CorpusRecord) => string[]
}

/** Key used for a value no rule in a dimension matched. */
export const UNCLASSIFIED = 'unclassified'

type Rule = [key: string, label: string, patterns: RegExp[]]

function matcher(rules: Rule[], unclassifiedLabel: string) {
  const buckets: Bucket[] = rules.map(([key, label]) => ({ key, label }))
  buckets.push({ key: UNCLASSIFIED, label: unclassifiedLabel })

  const classify = (text: string) => {
    const value = text.toLowerCase()
    const hits = rules.filter(([, , patterns]) => patterns.some((p) => p.test(value)))
    return hits.length > 0 ? hits.map(([key]) => key) : [UNCLASSIFIED]
  }

  return { buckets, classify }
}

// ---------------------------------------------------------------- stance

/*
  The one coded field. Seventeen values collapse to five, and the collapse turns
  on whether a value carries both a supportive and a critical marker: "Supportive
  but critical" is mixed, not supportive. The order runs supportive to critical
  because that is the axis, with the two non positions last.
*/
const STANCE_BUCKETS: Bucket[] = [
  { key: 'supportive', label: 'Supportive' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'critical', label: 'Critical' },
  { key: 'notreported', label: 'Not reported' },
  { key: UNCLASSIFIED, label: 'Stance not classified' },
]

function classifyStance(record: CorpusRecord): string[] {
  const value = record.normativeStance.toLowerCase()
  if (value.trim() === '') return [UNCLASSIFIED]
  const supportive = /supportive|advocat/.test(value)
  const critical = /critical|skeptic|sceptic/.test(value)
  if (/mixed|balanced/.test(value) || (supportive && critical)) return ['mixed']
  if (supportive) return ['supportive']
  if (critical) return ['critical']
  if (/neutral|descriptive|analytical/.test(value)) return ['neutral']
  if (/not reported|not stated/.test(value)) return ['notreported']
  return [UNCLASSIFIED]
}

// ---------------------------------------------------------------- level

/*
  A ladder from the smallest unit of governance a record names to the largest.
  Multi valued: a record reading "Local; Regional; National" holds three.

  Two rules are worth stating on the page, because a reader could reasonably have
  drawn them differently. "Federal" is national, since in every record using it
  the federal tier is the country tier. Bare "regional" is subnational, since in
  these records it almost always names a region inside one country; where it
  means a group of countries the record says so, and the transboundary or global
  pattern catches it as well.
*/
const LEVEL_RULES: Rule[] = [
  [
    'local',
    'Local',
    [
      /\blocal|\bcity|cities|municipal|village|hamlet|communit|grassroots|neighbou?rhood|\bward\b|parish|\btown\b|household|operational|\bfarm\b|site level/,
    ],
  ],
  [
    'subnational',
    'Subnational',
    [
      /\bstates?\b|province|provincial|\bregion|subnational|sub-national|count(y|ies)|prefectur|canton|regency|territor|emirate|panchayat|tribal|metropolitan|district|departmental/,
    ],
  ],
  ['national', 'National', [/\bnational|federal|\bcentral\b|country level|countrywide|nationwide/]],
  [
    'transboundary',
    'Transboundary',
    [/transbound|cross-border|cross border|binational|bi-national|\bbasin|catchment|watershed|river system/],
  ],
  [
    'global',
    'Global and international',
    [
      /global|international|supranational|supra-national|transnational|\beu\b|european|\bunesco|\boecd|united nations|worldwide/,
    ],
  ],
]

/*
  Twenty one records say the governance spans levels and never say which: bare
  "Multilevel", "Multi-scalar", "Multi-level / Polycentric". That is a finding
  about the recording, not a failure to match, so it is a bucket of its own and
  it is a fallback: a record reading "Multi-level (National, Regional, Local)"
  names its tiers and lands in those three instead.
*/
const LEVEL_SPANNING = /multi-?level|multi-?scal|cross-scale|polycentric|nested|all levels/

// ---------------------------------------------------------------- method

/*
  Multi valued, because the recorded text routinely names two or three designs in
  one sentence and picking one of them would be a coin toss. A study described as
  a mixed methods case study using interviews lands in three buckets, which is
  what it is.
*/
const METHOD_RULES: Rule[] = [
  ['casestudy', 'Case study', [/case stud|case-stud|\bcases\b|case analysis|case comparison|comparative analysis|comparative stud/]],
  [
    'interviews',
    'Interviews and fieldwork',
    [
      /interview|focus group|participant observation|\bethnograp|fieldwork|field work|field visit|field mission|workshop|\bsurvey|questionnaire|action research|\bdelphi\b|stakeholder consultation|\bobservation/,
    ],
  ],
  [
    'documents',
    'Document and policy analysis',
    [
      /document analysis|documentary|content analysis|policy document|policy analysis|policy text|text-as-data|text as data|discourse analysis|\blegal\b|doctrinal|legislative|media analysis|archival|topic model|process tracing|\bdocuments?\b/,
    ],
  ],
  [
    'review',
    'Review and synthesis',
    [
      /literature review|systematic review|scoping review|narrative review|\bprisma|bibliometric|meta-analysis|meta analysis|evidence synthesis|desk review|scoping study|\breviews?\b|\bsynthes[ei]s\b/,
    ],
  ],
  [
    'quantitative',
    'Quantitative and modelling',
    [
      /quantitative|statistical|regression|econometric|\bprobit|\blogit|principal component|\bpca\b|structural equation|modelling|modeling|simulation|agent-based|agent based|\bindex\b|network analysis|spatial analysis|geospatial|remote sensing|machine learning|\bbert|scenario analysis|monte carlo|\bahp\b|\babms?\b|system dynamics|quasi-experiment|\bexperiment/,
    ],
  ],
  [
    'conceptual',
    'Conceptual and theoretical',
    [
      /conceptual|theoretical|theory-building|theory building|framework development|develops a framework|\bessay\b|analytical framework|theory-driven|grounded theory|editorial|commentary/,
    ],
  ],
  [
    'mixed',
    'Mixed methods',
    [/mixed[- ]method|multi-method|multimethod|combining qualitative and quantitative/],
  ],
]

// ---------------------------------------------------------------- sector

/*
  Multi valued. Water alone appears in sixty four of the recorded values, often
  beside a second domain: "Flood disaster risk and water governance" is water and
  disaster risk, and counting it once for each is the same rule the country
  totals already use.
*/
const SECTOR_RULES: Rule[] = [
  [
    'water',
    'Water',
    [
      /\bwater|irrigation|\briver|groundwater|aquifer|sanitation|wetland|watershed|catchment|\bbasin|hydro|drought|wastewater/,
    ],
  ],
  ['climate', 'Climate', [/climate|carbon|emission|\bghg\b|\bredd\b|mitigation|decarbon|adaptation/]],
  [
    'disaster',
    'Disaster risk and crisis',
    [
      /disaster|\bflood|wildfire|\bfire\b|\bcris[ei]s|emergency|risk reduction|\bdrr\b|recovery|humanitarian|earthquake|cyclone|typhoon|hazard|resilience/,
    ],
  ],
  [
    'marine',
    'Marine and fisheries',
    [/marine|fisher|\bfishing|coastal|\bocean|\bmpa\b|protected area|\breef|aquaculture|\bseas?\b/],
  ],
  [
    'land',
    'Environment, land and biodiversity',
    [
      /forest|\bland\b|land[- ]use|biodiversity|conservation|wildlife|ecosystem|ecolog|rangeland|\bsoil|erosion|\bparks?\b|habitat|grazing|pastoral|environmental|pollution/,
    ],
  ],
  [
    'food',
    'Food and agriculture',
    [/agricultur|\bfood|farming|\bfarms?\b|livestock|\bcrops?\b|\bcattle|horticultur/],
  ],
  [
    'urban',
    'Urban, planning and infrastructure',
    [
      /urban|\bcity|cities|spatial planning|infrastructur|transport|mobility|housing|built environment|regeneration|heritage|construction/,
    ],
  ],
  ['health', 'Health', [/health|pandemic|covid|epidemic|medical|\bdisease/]],
  [
    'energy',
    'Energy and extractives',
    [/energy|electricit|renewable|\bsolar|wind power|\boil\b|\bgas\b|\bmining|extractive/],
  ],
  [
    'digital',
    'Digital and data',
    [
      /digital|\bdata\b|artificial intelligence|\bai\b|algorithm|smart city|technolog|platform|cyber/,
    ],
  ],
  ['education', 'Education', [/education|\bschools?\b|universit|\blearning|curricul/]],
  [
    'public',
    'Public administration and law',
    [
      /public administration|public sector|public polic|public service|governance reform|regulat|\blaw\b|legal|justice|human rights|security|peacebuilding|conflict|foreign policy|\bmilitar|\bdefen[cs]e|elector|democra|\bgovernment\b/,
    ],
  ],
  [
    'economy',
    'Economy and livelihoods',
    [/econom|financ|\btrade|\bmarket|business|industr|tourism|supply chain|livelihood/],
  ],
]

// ---------------------------------------------------------------- assembly

const level = matcher(LEVEL_RULES, 'Level not classified')
const method = matcher(METHOD_RULES, 'Design not classified')
const sector = matcher(SECTOR_RULES, 'Sector not classified')

/** The ladder, then the spanning bucket, then the residue. */
const LEVEL_BUCKETS: Bucket[] = [
  ...LEVEL_RULES.map(([key, label]) => ({ key, label })),
  { key: 'spanning', label: 'Multilevel, tiers not named' },
  { key: UNCLASSIFIED, label: 'Level not classified' },
]

function classifyLevel(record: CorpusRecord): string[] {
  const keys = level.classify(record.level)
  if (!keys.includes(UNCLASSIFIED)) return keys
  return LEVEL_SPANNING.test(record.level.toLowerCase()) ? ['spanning'] : [UNCLASSIFIED]
}

export const DIMENSIONS: Dimension[] = [
  {
    key: 'stance',
    label: 'Normative stance',
    sourceLabel: 'normative stance',
    multi: false,
    ordinal: true,
    buckets: STANCE_BUCKETS,
    classify: classifyStance,
  },
  {
    key: 'level',
    label: 'Level of governance',
    sourceLabel: 'level of governance',
    multi: true,
    ordinal: true,
    buckets: LEVEL_BUCKETS,
    classify: classifyLevel,
  },
  {
    key: 'method',
    label: 'Research design',
    sourceLabel: 'research design and method',
    multi: true,
    ordinal: false,
    buckets: method.buckets,
    classify: (record) => method.classify(record.method),
  },
  {
    key: 'sector',
    label: 'Sector',
    sourceLabel: 'sector or policy domain',
    multi: true,
    ordinal: false,
    buckets: sector.buckets,
    classify: (record) => sector.classify(record.sector),
  },
]

export type RecordFacets = Record<DimensionKey, string[]>

/** Every bucket a record falls in, across all four dimensions. */
export function facetsFor(record: CorpusRecord): RecordFacets {
  return {
    stance: DIMENSIONS[0].classify(record),
    level: DIMENSIONS[1].classify(record),
    method: DIMENSIONS[2].classify(record),
    sector: DIMENSIONS[3].classify(record),
  }
}
