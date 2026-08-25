'use client'

import Fuse from 'fuse.js'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { FIELD_LABELS, type CorpusRecord } from './types'

/**
 * Data browser. Built for checking the corpus. It uses the design tokens so the
 * candidate systems can be judged on a real table.
 */

const NO_COUNTRY_SCALES = ['global', 'regional', 'transboundary', 'conceptual'] as const
const SCALE_PREFIX = 'scale:'

type Filters = {
  q: string
  country: string
  sector: string
  method: string
  level: string
  stance: string
  year: string
}

function countBy(records: CorpusRecord[], pick: (r: CorpusRecord) => string[]) {
  const counts = new Map<string, number>()
  for (const record of records) {
    for (const value of pick(record)) {
      if (value === '') continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export default function CorpusBrowser({ records }: { records: CorpusRecord[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filters: Filters = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      country: searchParams.get('country') ?? '',
      sector: searchParams.get('sector') ?? '',
      method: searchParams.get('method') ?? '',
      level: searchParams.get('level') ?? '',
      stance: searchParams.get('stance') ?? '',
      year: searchParams.get('year') ?? '',
    }),
    [searchParams]
  )

  const setFilter = useCallback(
    (key: keyof Filters, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value === '') next.delete(key)
      else next.set(key, value)
      const query = next.toString()
      router.replace(query ? `/corpus?${query}` : '/corpus', { scroll: false })
    },
    [router, searchParams]
  )

  const clearAll = useCallback(() => router.replace('/corpus', { scroll: false }), [router])

  // ---------------------------------------------------------------- vocabularies

  const countryOptions = useMemo(() => countBy(records, (r) => r.countries), [records])

  const noCountryOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const record of records) {
      if (record.countries.length > 0) continue
      const scale = record.geographicScale || 'unspecified'
      counts.set(scale, (counts.get(scale) ?? 0) + 1)
    }
    return NO_COUNTRY_SCALES.map((scale) => [scale, counts.get(scale) ?? 0] as const).filter(
      ([, n]) => n > 0
    )
  }, [records])

  const sectorOptions = useMemo(() => countBy(records, (r) => [r.sector]), [records])
  const methodOptions = useMemo(() => countBy(records, (r) => [r.method]), [records])
  const levelOptions = useMemo(() => countBy(records, (r) => [r.level]), [records])
  const stanceOptions = useMemo(() => countBy(records, (r) => [r.normativeStance]), [records])
  const yearOptions = useMemo(
    () =>
      countBy(records, (r) => [r.year === null ? '' : String(r.year)]).sort((a, b) =>
        a[0].localeCompare(b[0])
      ),
    [records]
  )

  // ---------------------------------------------------------------- search

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

  const matches = useMemo(() => {
    let list = records

    if (filters.q.trim() !== '') {
      list = fuse.search(filters.q.trim()).map((hit) => hit.item)
    }

    if (filters.country !== '') {
      if (filters.country.startsWith(SCALE_PREFIX)) {
        const scale = filters.country.slice(SCALE_PREFIX.length)
        list = list.filter((r) => r.countries.length === 0 && r.geographicScale === scale)
      } else {
        list = list.filter((r) => r.countries.includes(filters.country))
      }
    }

    const contains = (haystack: string, needle: string) =>
      haystack.toLowerCase().includes(needle.trim().toLowerCase())

    if (filters.sector !== '') list = list.filter((r) => contains(r.sector, filters.sector))
    if (filters.method !== '') list = list.filter((r) => contains(r.method, filters.method))
    if (filters.level !== '') list = list.filter((r) => contains(r.level, filters.level))
    if (filters.stance !== '') list = list.filter((r) => r.normativeStance === filters.stance)
    if (filters.year !== '') list = list.filter((r) => String(r.year) === filters.year)

    return list
  }, [records, fuse, filters])

  const selected = useMemo(
    () => (selectedId === null ? null : records.find((r) => r.id === selectedId) ?? null),
    [records, selectedId]
  )

  const activeCount = Object.entries(filters).filter(([, v]) => v !== '').length

  // ---------------------------------------------------------------- render

  return (
    <div className="bg-surface p-4 text-ink">
      <h1 className="text-2xl font-bold">Corpus</h1>
      <p className="mt-1">
        {records.length} records. Unstyled view for checking the data.
      </p>

      <div className="mt-4 border border-rule bg-surface-raised p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="block text-sm text-ink-muted">Search title, authors, screening note</span>
            <input
              type="search"
              className="mt-1 w-full border border-rule bg-surface p-1 text-ink"
              defaultValue={filters.q}
              onChange={(e) => setFilter('q', e.currentTarget.value)}
              placeholder="fuzzy search"
            />
          </label>

          <label className="block">
            <span className="block text-sm text-ink-muted">Country</span>
            <select
              className="mt-1 w-full border border-rule bg-surface p-1 text-ink"
              value={filters.country}
              onChange={(e) => setFilter('country', e.currentTarget.value)}
            >
              <option value="">All ({records.length})</option>
              <optgroup label="Country">
                {countryOptions.map(([code, n]) => (
                  <option key={code} value={code}>
                    {code} ({n})
                  </option>
                ))}
              </optgroup>
              <optgroup label="No country">
                {noCountryOptions.map(([scale, n]) => (
                  <option key={scale} value={`${SCALE_PREFIX}${scale}`}>
                    {scale} ({n})
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className="block">
            <span className="block text-sm text-ink-muted">Normative stance</span>
            <select
              className="mt-1 w-full border border-rule bg-surface p-1 text-ink"
              value={filters.stance}
              onChange={(e) => setFilter('stance', e.currentTarget.value)}
            >
              <option value="">All</option>
              {stanceOptions.map(([value, n]) => (
                <option key={value} value={value}>
                  {value} ({n})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm text-ink-muted">Year</span>
            <select
              className="mt-1 w-full border border-rule bg-surface p-1 text-ink"
              value={filters.year}
              onChange={(e) => setFilter('year', e.currentTarget.value)}
            >
              <option value="">All</option>
              {yearOptions.map(([value, n]) => (
                <option key={value} value={value}>
                  {value} ({n})
                </option>
              ))}
            </select>
          </label>

          <FreeTextFilter
            label={`Sector or policy domain (${sectorOptions.length} distinct)`}
            listId="sector-values"
            value={filters.sector}
            options={sectorOptions}
            onChange={(v) => setFilter('sector', v)}
          />
          <FreeTextFilter
            label={`Research design and method (${methodOptions.length} distinct)`}
            listId="method-values"
            value={filters.method}
            options={methodOptions}
            onChange={(v) => setFilter('method', v)}
          />
          <FreeTextFilter
            label={`Level of governance (${levelOptions.length} distinct)`}
            listId="level-values"
            value={filters.level}
            options={levelOptions}
            onChange={(v) => setFilter('level', v)}
          />

          <div className="flex items-end">
            <button type="button" className="min-h-11 border border-rule px-3 py-1 text-ink" onClick={clearAll}>
              Clear filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-ink-muted">
          Sector, method and level match on substring, because each has close to one distinct value
          per record. Pick from the list or type part of a value.
        </p>
      </div>

      <p className="mt-4 font-bold" aria-live="polite">
        {matches.length} of {records.length} records match
      </p>

      <div className="mt-2 lg:flex lg:gap-4">
        <div className="min-w-0 lg:flex-1">
          {matches.length === 0 ? (
            <p className="border border-rule p-4">No records match those filters. Clear one and try again.</p>
          ) : (
            <div className="overflow-x-auto border border-rule">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-rule bg-surface-raised p-1 text-left">ID</th>
                    <th className="border border-rule bg-surface-raised p-1 text-left">Year</th>
                    <th className="border border-rule bg-surface-raised p-1 text-left">Title</th>
                    <th className="border border-rule bg-surface-raised p-1 text-left">Authors</th>
                    <th className="border border-rule bg-surface-raised p-1 text-left">Countries</th>
                    <th className="border border-rule bg-surface-raised p-1 text-left">Scale</th>
                    <th className="border border-rule bg-surface-raised p-1 text-left">Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedId(record.id)}
                      className={
                        record.id === selectedId
                          ? 'cursor-pointer outline outline-2 outline-accent'
                          : 'cursor-pointer'
                      }
                    >
                      <td className="border border-rule p-1 align-top">
                        <button
                          type="button"
                          className="underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(record.id)
                          }}
                        >
                          {record.id}
                        </button>
                      </td>
                      <td className="border border-rule p-1 align-top">{record.year ?? 'not parsed'}</td>
                      <td className="border border-rule p-1 align-top">{record.title}</td>
                      <td className="border border-rule p-1 align-top">{record.authors.join('; ')}</td>
                      <td className="border border-rule p-1 align-top">
                        {record.countries.length ? record.countries.join(', ') : 'none'}
                      </td>
                      <td className="border border-rule p-1 align-top">{record.geographicScale}</td>
                      <td className="border border-rule p-1 align-top">{record.sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <aside className="mt-4 border border-rule bg-surface-raised p-3 lg:mt-0 lg:max-h-[80vh] lg:w-[28rem] lg:shrink-0 lg:overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold">Record {selected.id}</h2>
              <button type="button" className="min-h-11 border border-rule px-2" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
            <dl className="mt-2 text-sm">
              {FIELD_LABELS.map(({ key, label }) => (
                <div key={key} className="mt-2">
                  <dt className="font-bold">{label}</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {renderValue(selected[key])}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>
    </div>
  )
}

function renderValue(value: CorpusRecord[keyof CorpusRecord]) {
  if (Array.isArray(value)) return value.length ? value.join('; ') : 'empty'
  if (value === null) return 'not parsed'
  if (value === '') return 'empty'
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return (
      <a href={value} className="underline" target="_blank" rel="noreferrer">
        {value}
      </a>
    )
  }
  return String(value)
}

function FreeTextFilter({
  label,
  listId,
  value,
  options,
  onChange,
}: {
  label: string
  listId: string
  value: string
  options: (readonly [string, number])[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="block text-sm text-ink-muted">{label}</span>
      <input
        type="text"
        className="mt-1 w-full border border-rule bg-surface p-1 text-ink"
        list={listId}
        defaultValue={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="type part of a value"
      />
      <datalist id={listId}>
        {options.map(([option, n]) => (
          <option key={option} value={option}>
            {n}
          </option>
        ))}
      </datalist>
    </label>
  )
}
