'use client'

import { useState } from 'react'

import { FIELD_LABELS, type CorpusRecord } from '@/app/corpus/types'
import copy from '@/content/corpus page.json'

/**
 * The record table and the record detail.
 *
 * This is the half of the page that finds a specific paper. It does not move and
 * it does not summarise: everything above it is the shape of the corpus, and
 * this is the corpus itself, holding exactly what the selection above holds.
 */

const TH = 'border-b border-rule bg-surface-raised p-2 text-left align-bottom font-semibold'
const TD = 'border-b border-rule p-2 align-top'

export default function CorpusTable({
  records,
  emptyLabel,
}: {
  records: CorpusRecord[]
  emptyLabel: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId === null ? null : records.find((r) => r.id === selectedId) ?? null
  const c = copy.table

  if (records.length === 0) {
    return <p className="border border-rule p-4 text-[0.9rem]">{emptyLabel}</p>
  }

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      <div className="min-w-0 overflow-x-auto border-t border-rule lg:flex-1">
        <table className="w-full min-w-[52rem] border-collapse text-[0.8rem]">
          <thead>
            <tr>
              <th scope="col" className={TH}>{c.columns.id}</th>
              <th scope="col" className={TH}>{c.columns.year}</th>
              <th scope="col" className={TH}>{c.columns.title}</th>
              <th scope="col" className={TH}>{c.columns.authors}</th>
              <th scope="col" className={TH}>{c.columns.countries}</th>
              <th scope="col" className={TH}>{c.columns.scale}</th>
              <th scope="col" className={TH}>{c.columns.sector}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className={record.id === selectedId ? 'outline outline-2 outline-accent' : ''}
              >
                <td className={TD}>
                  {/* A bare identifier is a 7 pixel target. Held at 24 square,
                      which is the WCAG 2.2 minimum, rather than left as the
                      width of the digits it happens to contain. */}
                  <button
                    type="button"
                    aria-expanded={record.id === selectedId}
                    className="inline-flex min-h-6 min-w-6 items-center justify-center text-accent underline underline-offset-4 tabular-nums"
                    onClick={() => setSelectedId(record.id === selectedId ? null : record.id)}
                  >
                    {record.id}
                  </button>
                </td>
                <td className={`${TD} tabular-nums`}>{record.year ?? c.noYear}</td>
                <td className={`${TD} min-w-[22rem]`}>{record.title}</td>
                <td className={`${TD} text-ink-muted`}>{record.authors.join('; ')}</td>
                <td className={`${TD} text-ink-muted`}>
                  {record.countries.length ? record.countries.join(', ') : c.noCountries}
                </td>
                <td className={`${TD} text-ink-muted`}>{record.geographicScale}</td>
                <td className={`${TD} text-ink-muted`}>{record.sector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <aside className="mt-6 border border-rule bg-surface-raised p-4 lg:sticky lg:top-24 lg:mt-0 lg:max-h-[80vh] lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold">
              {c.recordHeading} {selected.id}
            </h3>
            <button
              type="button"
              className="min-h-11 shrink-0 border border-rule px-3 text-[0.8rem]"
              onClick={() => setSelectedId(null)}
            >
              {c.close}
            </button>
          </div>
          <dl className="mt-3 text-[0.8rem]">
            {FIELD_LABELS.map(({ key, label }) => (
              <div key={key} className="mt-3">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="whitespace-pre-wrap break-words">{renderValue(selected[key], c)}</dd>
              </div>
            ))}
          </dl>
        </aside>
      )}
    </div>
  )
}

function renderValue(value: CorpusRecord[keyof CorpusRecord], c: typeof copy.table) {
  if (Array.isArray(value)) return value.length ? value.join('; ') : c.emptyField
  if (value === null) return c.noYear
  if (value === '') return c.emptyField
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return (
      <a href={value} className="text-accent underline underline-offset-4" target="_blank" rel="noreferrer">
        {value}
      </a>
    )
  }
  return String(value)
}
