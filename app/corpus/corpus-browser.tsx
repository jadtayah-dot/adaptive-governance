'use client'

import Fuse from 'fuse.js'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import CorpusBreakdown from '@/components/CorpusBreakdown'
import CorpusRanking, { type RankRow } from '@/components/CorpusRanking'
import CorpusTable from '@/components/CorpusTable'
import CorpusYears from '@/components/CorpusYears'
import copy from '@/content/corpus page.json'
import countryNames from '@/content/country names.json'
import globe from '@/content/globe.json'
import home from '@/content/home.json'
import { DIMENSIONS, type DimensionKey, facetsFor } from '@/lib/corpus-dimensions'

import type { CorpusRecord } from './types'

/**
 * The corpus, as a distribution first and a table second.
 *
 * The table answers "where is this paper". It cannot answer "what does this
 * literature look like", because a list of 217 rows has no shape. The ranking,
 * the year strip and the four breakdowns above it are that second question, and
 * they are joined to the table rather than sitting beside it: one selection
 * drives all of them, and the table is closed until it is asked for.
 *
 * The selection lives in the address of the page, as repeated parameters, so a
 * filtered view can be linked and cited. Within one dimension the choices are a
 * union, because a study cannot be both supportive and critical and asking for
 * both plainly means either. Across dimensions they are an intersection.
 *
 * Every count a panel shows is computed with that panel's own choices lifted, so
 * a group still reports what choosing it would bring rather than reporting zero
 * because something else in the same panel is already chosen.
 *
 * Resting on a group sets a preview instead of a selection. Every bar outside
 * the group being rested on is cut back to the part of itself that group holds,
 * which is a cross tabulation of six dimensions read off one gesture, with
 * nothing committed to the address until it is chosen.
 */

/** Keys for records set in no single country, kept apart from the alpha 3 codes. */
const SCALE_PREFIX = 'scale:'
const SCALES = ['global', 'regional', 'transboundary', 'conceptual'] as const

/** The two groups that are not one of the four derived breakdowns. */
const COUNTRY_GROUP = 'country'
const YEAR_GROUP = 'year'

const SECTION_HEADING = 'text-[1.6rem] font-semibold tracking-tight'
const DETAIL = 'mt-2 max-w-[68ch] text-[0.9rem] leading-relaxed text-ink-muted'

type Group = DimensionKey | typeof COUNTRY_GROUP | typeof YEAR_GROUP
type Preview = { group: string; key: string } | null

type Selection = {
  country: string[]
  stance: string[]
  level: string[]
  method: string[]
  sector: string[]
  year: string[]
  q: string
}

export default function CorpusBrowser({ records }: { records: CorpusRecord[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [preview, setPreview] = useState<Preview>(null)
  const [tableOpen, setTableOpen] = useState(false)

  const names = countryNames as Record<string, string>
  const unit = useCallback(
    (n: number) => (n === 1 ? globe.tooltip.study : globe.tooltip.studies),
    []
  )

  // ---------------------------------------------------------------- selection

  const selection: Selection = useMemo(
    () => ({
      country: searchParams.getAll('country'),
      stance: searchParams.getAll('stance'),
      level: searchParams.getAll('level'),
      method: searchParams.getAll('method'),
      sector: searchParams.getAll('sector'),
      year: searchParams.getAll('year'),
      q: searchParams.get('q') ?? '',
    }),
    [searchParams]
  )

  const write = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString()
      router.replace(query ? `/corpus?${query}` : '/corpus', { scroll: false })
    },
    [router]
  )

  const toggle = useCallback(
    (param: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      const held = next.getAll(param)
      next.delete(param)
      for (const v of held.includes(value) ? held.filter((v) => v !== value) : [...held, value]) {
        next.append(param, v)
      }
      write(next)
    },
    [searchParams, write]
  )

  const setSingle = useCallback(
    (param: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value === '') next.delete(param)
      else next.set(param, value)
      write(next)
    },
    [searchParams, write]
  )

  const clearAll = useCallback(() => router.replace('/corpus', { scroll: false }), [router])

  // ---------------------------------------------------------------- filtering

  const facets = useMemo(() => {
    const map = new Map<string, ReturnType<typeof facetsFor>>()
    for (const record of records) map.set(record.id, facetsFor(record))
    return map
  }, [records])

  const fuse = useMemo(
    () =>
      new Fuse(records, {
        keys: ['title', 'authors', 'note'],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [records]
  )

  const searched = useMemo(() => {
    if (selection.q.trim() === '') return records
    return fuse.search(selection.q.trim()).map((hit) => hit.item)
  }, [records, fuse, selection.q])

  const holdsCountry = useCallback((record: CorpusRecord, key: string) => {
    if (!key.startsWith(SCALE_PREFIX)) return record.countries.includes(key)
    return record.countries.length === 0 && record.geographicScale === key.slice(SCALE_PREFIX.length)
  }, [])

  /**
   * The selection applied, optionally with one group lifted so that group can
   * report what its unchosen members would bring.
   */
  const apply = useCallback(
    (lift?: Group) =>
      searched.filter((record) => {
        if (lift !== YEAR_GROUP && selection.year.length > 0) {
          if (!selection.year.includes(String(record.year))) return false
        }
        if (lift !== COUNTRY_GROUP && selection.country.length > 0) {
          if (!selection.country.some((key) => holdsCountry(record, key))) return false
        }
        const recordFacets = facets.get(record.id)!
        for (const dimension of DIMENSIONS) {
          if (lift === dimension.key) continue
          const chosen = selection[dimension.key]
          if (chosen.length === 0) continue
          if (!recordFacets[dimension.key].some((key) => chosen.includes(key))) return false
        }
        return true
      }),
    [searched, selection, facets, holdsCountry]
  )

  const matches = useMemo(() => apply(), [apply])

  /**
   * Whether a record falls in the group being rested on. Null when nothing is,
   * which is what turns every preview off from one place.
   */
  const inPreview = useMemo(() => {
    if (preview === null) return null
    const { group, key } = preview
    if (group === COUNTRY_GROUP) return (r: CorpusRecord) => holdsCountry(r, key)
    if (group === YEAR_GROUP) return (r: CorpusRecord) => String(r.year) === key
    return (r: CorpusRecord) => facets.get(r.id)![group as DimensionKey].includes(key)
  }, [preview, facets, holdsCountry])

  /**
   * Counts for one group, and beside them the share of each count the preview
   * holds. One pass over the pool, because the preview has to keep up with a
   * pointer moving down a list of sixty six rows.
   */
  const tally = useCallback(
    (group: Group, pool: CorpusRecord[], keysOf: (record: CorpusRecord) => string[]) => {
      const total = new Map<string, number>()
      const held = new Map<string, number>()
      // A group is not previewed against itself: the answer would be the bar.
      const test = preview !== null && preview.group !== group ? inPreview : null
      for (const record of pool) {
        const inside = test !== null && test(record)
        for (const key of keysOf(record)) {
          total.set(key, (total.get(key) ?? 0) + 1)
          if (inside) held.set(key, (held.get(key) ?? 0) + 1)
        }
      }
      if (test === null) return { total, brush: null }
      const brush = new Map<string, number>()
      for (const [key, n] of total) brush.set(key, n > 0 ? (held.get(key) ?? 0) / n : 0)
      return { total, brush }
    },
    [preview, inPreview]
  )

  // ---------------------------------------------------------------- the bars

  /** Resting order: the whole corpus, descending. The DOM order never changes. */
  const restingCountries = useMemo(() => {
    const counts = new Map<string, number>()
    for (const record of records) {
      for (const code of record.countries) counts.set(code, (counts.get(code) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [records])

  const restingScales = useMemo(() => {
    const counts = new Map<string, number>()
    for (const record of records) {
      if (record.countries.length > 0) continue
      counts.set(record.geographicScale, (counts.get(record.geographicScale) ?? 0) + 1)
    }
    return SCALES.map((scale) => [scale, counts.get(scale) ?? 0] as const).filter(([, n]) => n > 0)
  }, [records])

  const countryPool = useMemo(() => apply(COUNTRY_GROUP), [apply])

  const countries = useMemo(() => {
    const { total, brush } = tally(COUNTRY_GROUP, countryPool, (r) => r.countries)
    const rows: RankRow[] = restingCountries.map(([code, baseline]) => ({
      key: code,
      label: names[code] ?? code,
      value: total.get(code) ?? 0,
      baseline,
    }))
    return { rows, brush }
  }, [countryPool, restingCountries, names, tally])

  const scales = useMemo(() => {
    const { total, brush } = tally(COUNTRY_GROUP, countryPool, (r) =>
      r.countries.length > 0 ? [] : [`${SCALE_PREFIX}${r.geographicScale}`]
    )
    const rows: RankRow[] = restingScales.map(([scale, baseline]) => ({
      key: `${SCALE_PREFIX}${scale}`,
      label: scale,
      value: total.get(`${SCALE_PREFIX}${scale}`) ?? 0,
      baseline,
    }))
    return { rows, brush }
  }, [countryPool, restingScales, tally])

  const countrySelected = useMemo(() => new Set(selection.country), [selection.country])

  // ---------------------------------------------------------------- the years

  /**
   * A continuous run from the first year in the corpus to the last. Years the
   * corpus does not reach are drawn empty rather than left out, because a gap in
   * a run of years says something and a list that closes up the gaps does not.
   */
  const yearRange = useMemo(() => {
    const known = records.map((r) => r.year).filter((y): y is number => y !== null)
    const from = Math.min(...known)
    const to = Math.max(...known)
    return Array.from({ length: to - from + 1 }, (_, i) => String(from + i))
  }, [records])

  const years = useMemo(() => {
    const pool = apply(YEAR_GROUP)
    const { total, brush } = tally(YEAR_GROUP, pool, (r) =>
      r.year === null ? [] : [String(r.year)]
    )
    return {
      columns: yearRange.map((year) => ({ key: year, label: year, value: total.get(year) ?? 0 })),
      brush,
    }
  }, [apply, tally, yearRange])

  const yearSelected = useMemo(() => new Set(selection.year), [selection.year])

  // ---------------------------------------------------------------- the panels

  /** Whole corpus totals per bucket. Fix the ordering and decide what is shown. */
  const baselines = useMemo(() => {
    const out = new Map<DimensionKey, Map<string, number>>()
    for (const dimension of DIMENSIONS) {
      const counts = new Map<string, number>()
      for (const record of records) {
        for (const key of facets.get(record.id)![dimension.key]) {
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }
      out.set(dimension.key, counts)
    }
    return out
  }, [records, facets])

  const breakdowns = useMemo(
    () =>
      DIMENSIONS.map((dimension) => {
        const pool = apply(dimension.key)
        const { total, brush } = tally(dimension.key, pool, (record) =>
          facets.get(record.id)![dimension.key]
        )
        const baseline = baselines.get(dimension.key)!
        const rows = dimension.buckets
          // A bucket nothing in the corpus falls in is dropped. A bucket the
          // current selection empties is kept, because that emptiness is the
          // answer to what was just chosen.
          .filter((bucket) => (baseline.get(bucket.key) ?? 0) > 0)
          .map((bucket) => ({
            key: bucket.key,
            label: bucket.label,
            value: total.get(bucket.key) ?? 0,
          }))
        return {
          dimension,
          brush,
          // Ordinal dimensions keep the ladder they are given. Nominal ones are
          // sorted once, over the whole corpus, and then held: sorting them by
          // the live count would move a control as it is being used.
          rows: dimension.ordinal
            ? rows
            : [...rows].sort((a, b) => (baseline.get(b.key) ?? 0) - (baseline.get(a.key) ?? 0)),
          selected: new Set(selection[dimension.key]),
        }
      }),
    [apply, tally, facets, baselines, selection]
  )

  // ---------------------------------------------------------------- chips

  const chips = useMemo(() => {
    const out: { id: string; label: string; onRemove: () => void }[] = []
    for (const key of selection.country) {
      const label = key.startsWith(SCALE_PREFIX) ? key.slice(SCALE_PREFIX.length) : names[key] ?? key
      out.push({ id: `country:${key}`, label, onRemove: () => toggle('country', key) })
    }
    for (const key of selection.year) {
      out.push({ id: `year:${key}`, label: key, onRemove: () => toggle('year', key) })
    }
    for (const dimension of DIMENSIONS) {
      for (const key of selection[dimension.key]) {
        const bucket = dimension.buckets.find((b) => b.key === key)
        out.push({
          id: `${dimension.key}:${key}`,
          label: bucket?.label ?? key,
          onRemove: () => toggle(dimension.key, key),
        })
      }
    }
    if (selection.q.trim() !== '') {
      out.push({ id: 'q', label: selection.q, onRemove: () => setSingle('q', '') })
    }
    return out
  }, [selection, names, toggle, setSingle])

  // ---------------------------------------------------------------- render

  const c = copy
  /** "of 217 studies" without the leading count, for the disclosure line. */
  const unitAlone = bareUnit(c.selection.unit)

  return (
    <div className="w-full px-6 pb-24 pt-12 md:px-10 md:pt-16 2xl:px-16">
      <h1 className="text-[2.25rem] leading-tight font-semibold tracking-tight md:text-[3rem]">
        {c.title}
      </h1>
      <p className="mt-5 max-w-[68ch] text-[1.25rem] leading-snug text-ink-muted">{c.standfirst}</p>

      {/* Stays in reach. The page is long, and the count and the way out of a
          selection are the two things a reader needs from anywhere on it. */}
      <div className="sticky top-0 z-20 -mx-6 mt-10 border-y border-rule bg-surface px-6 py-3 md:-mx-10 md:px-10 2xl:-mx-16 2xl:px-16">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="text-[1.6rem] font-semibold tabular-nums" aria-live="polite">
            {matches.length}{' '}
            <span className="text-[0.9rem] font-normal text-ink-muted">{c.selection.unit}</span>
          </p>
          {chips.length === 0 ? (
            <p className="text-[0.8rem] text-ink-muted">{c.selection.none}</p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <li key={chip.id}>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      className="border border-rule px-2 py-1 text-[0.8rem] text-ink"
                    >
                      {chip.label}
                      <span className="ml-2 text-ink-muted" aria-hidden="true">
                        ×
                      </span>
                      <span className="sr-only"> {c.selection.remove}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={clearAll}
                className="text-[0.8rem] text-accent underline underline-offset-4"
              >
                {c.selection.clear}
              </button>
            </>
          )}
        </div>
        <p className="mt-2 max-w-[68ch] text-[0.8rem] leading-snug text-ink-muted">
          {home.corpus.globeNote} {c.selection.rule}
        </p>
      </div>

      <section aria-labelledby="years-heading" className="mt-12">
        <h2 id="years-heading" className={SECTION_HEADING}>
          {c.years.heading}
        </h2>
        <p className={DETAIL}>{c.years.detail}</p>
        <div className="mt-6 max-w-[52rem]">
          <CorpusYears
            columns={years.columns}
            selected={yearSelected}
            brush={years.brush}
            onToggle={(key) => toggle('year', key)}
            onPreview={setPreview}
            unit={unit}
            group={YEAR_GROUP}
            tickEvery={5}
          />
        </div>
        <p className="mt-8 max-w-[68ch] text-[0.9rem] leading-relaxed text-ink">
          {c.selection.preview}
        </p>
      </section>

      <div className="mt-16 grid gap-x-12 gap-y-16 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="ranking-heading" className="min-w-0">
          <h2 id="ranking-heading" className={SECTION_HEADING}>
            {c.ranking.heading}
          </h2>
          <p className={DETAIL}>{c.ranking.detail}</p>
          <p className="mt-2 max-w-[68ch] text-[0.9rem] leading-relaxed text-ink">
            {globe.descentNote}
          </p>

          <div className="mt-6">
            <CorpusRanking
              rows={countries.rows}
              selected={countrySelected}
              brush={countries.brush}
              onToggle={(key) => toggle('country', key)}
              onPreview={setPreview}
              unit={unit}
              emptyLabel={c.ranking.empty}
              group={COUNTRY_GROUP}
            />
          </div>

          <h3 className="mt-12 text-[1rem] font-semibold">{c.ranking.noCountryHeading}</h3>
          <p className="mt-1 max-w-[68ch] text-[0.8rem] leading-snug text-ink-muted">
            {c.ranking.noCountryDetail}
          </p>
          <div className="mt-4">
            <CorpusRanking
              rows={scales.rows}
              selected={countrySelected}
              brush={scales.brush}
              onToggle={(key) => toggle('country', key)}
              onPreview={setPreview}
              unit={unit}
              emptyLabel={c.ranking.empty}
              group={COUNTRY_GROUP}
            />
          </div>
        </section>

        <section aria-labelledby="breakdowns-heading" className="min-w-0">
          <h2 id="breakdowns-heading" className={SECTION_HEADING}>
            {c.breakdowns.heading}
          </h2>
          <p className={DETAIL}>{c.breakdowns.derivation}</p>

          <div className="mt-8 grid gap-10 sm:grid-cols-2 xl:grid-cols-1">
            {breakdowns.map(({ dimension, rows, selected, brush }) => (
              <CorpusBreakdown
                key={dimension.key}
                heading={dimension.label}
                rows={rows}
                selected={selected}
                brush={brush}
                onToggle={(key) => toggle(dimension.key, key)}
                onPreview={setPreview}
                note={dimension.multi ? c.breakdowns.multi : c.breakdowns.single}
                unit={unit}
                group={dimension.key}
              />
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby="table-heading" className="mt-20">
        <h2 id="table-heading" className={SECTION_HEADING}>
          {c.table.heading}
        </h2>
        <p className={DETAIL}>
          {c.table.detail} {c.selection.link}
        </p>

        <label className="mt-6 block max-w-[26rem]">
          <span className="block text-[0.8rem] text-ink-muted">{c.table.searchLabel}</span>
          <input
            type="search"
            className="mt-1 min-h-11 w-full border border-rule bg-surface px-2 text-ink"
            defaultValue={selection.q}
            onChange={(e) => setSingle('q', e.currentTarget.value)}
            placeholder={c.table.searchPlaceholder}
          />
        </label>

        {/*
          Closed to begin with, and the rows are not built until it is opened.
          Two hundred and seventeen rows of seven cells is fifteen hundred nodes
          under a page whose whole argument is above them.
        */}
        <div className="mt-8 border-t border-rule pt-4">
          <button
            type="button"
            aria-expanded={tableOpen}
            aria-controls="records"
            onClick={() => setTableOpen((open) => !open)}
            className="flex min-h-11 w-full items-center gap-3 text-left"
          >
            <span aria-hidden="true" className="text-[1.25rem] leading-none text-accent">
              {tableOpen ? '−' : '+'}
            </span>
            <span className="font-semibold">{tableOpen ? c.table.hide : c.table.show}</span>
            <span className="text-[0.9rem] tabular-nums text-ink-muted">
              {matches.length} {unitAlone}
            </span>
          </button>

          <div id="records" className="mt-6">
            {tableOpen ? (
              <CorpusTable records={matches} emptyLabel={home.corpus.emptyState} />
            ) : (
              <p className="max-w-[68ch] text-[0.9rem] leading-relaxed text-ink-muted">
                {c.table.closed}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * The unit out of the copy line, with the leading count dropped. The copy file
 * carries one string, "of 217 studies", and the disclosure needs the noun on its
 * own beside a live count. Taking it from the same string rather than writing a
 * second one keeps the word in one place.
 */
function bareUnit(line: string) {
  return line.replace(/^of\s+[\d,]+\s+/, '')
}
