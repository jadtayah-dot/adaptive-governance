'use client'

import { useMemo, useRef } from 'react'

import { restingStyle, useBars, type BarState, type Brush } from '@/lib/corpus-bars'
import { fill } from '@/lib/corpus-motion'

/**
 * One of the four breakdowns.
 *
 * The order of the groups is fixed and does not respond to the selection. The
 * ranking of countries re ranks because ordering by count is what it is for;
 * these are controls, and a control that moves out from under the pointer as it
 * is used is a control that cannot be used. Only the bars move.
 */

export type BreakdownRow = {
  key: string
  label: string
  value: number
}

export default function CorpusBreakdown({
  heading,
  rows,
  selected,
  brush,
  onToggle,
  onPreview,
  note,
  unit,
  group,
}: {
  heading: string
  rows: BreakdownRow[]
  selected: ReadonlySet<string>
  brush: Brush
  onToggle: (key: string) => void
  onPreview: (at: { group: string; key: string } | null) => void
  note: string
  unit: (n: number) => string
  group: string
}) {
  const container = useRef<HTMLUListElement>(null)
  const max = rows.reduce((acc, row) => Math.max(acc, row.value), 0)

  const targets = useMemo(() => {
    const out = new Map<string, BarState>()
    for (const row of rows) {
      out.set(row.key, { offset: 0, main: max > 0 ? row.value / max : 0, opacity: 1 })
    }
    return out
  }, [rows, max])

  useBars(container, targets, brush, 'x')

  return (
    <section aria-labelledby={`breakdown-${heading}`}>
      <h3 id={`breakdown-${heading}`} className="text-[1rem] font-semibold">
        {heading}
      </h3>
      <p className="mt-1 text-[0.8rem] leading-snug text-ink-muted">{note}</p>

      <ul
        ref={container}
        className="mt-3"
        onMouseLeave={() => onPreview(null)}
        onBlur={() => onPreview(null)}
      >
        {rows.map((row) => {
          const at = targets.get(row.key)!
          const resting = restingStyle(at, brush, row.key, 'x')
          const isSelected = selected.has(row.key)
          return (
            <li key={row.key} data-bar={row.key}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(row.key)}
                onMouseEnter={() => onPreview({ group, key: row.key })}
                onFocus={() => onPreview({ group, key: row.key })}
                className={`block w-full px-1 py-1 text-left ${
                  isSelected ? 'outline outline-2 outline-accent' : ''
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={`min-w-0 truncate text-[0.8rem] ${
                      isSelected ? 'font-semibold text-ink' : 'text-ink-muted'
                    }`}
                    title={row.label}
                  >
                    {row.label}
                  </span>
                  <span className="shrink-0 text-[0.8rem] tabular-nums text-ink">
                    {row.value}
                    <span className="sr-only"> {unit(row.value)}</span>
                  </span>
                </span>
                <span className="relative mt-1 block h-3 overflow-hidden border border-rule bg-globe-land">
                  <span
                    data-part="fill"
                    aria-hidden="true"
                    className="absolute inset-0 origin-left"
                    style={{ ...resting.fill, backgroundColor: fill(row.value, max) }}
                  />
                  <span
                    data-part="erase"
                    aria-hidden="true"
                    className="absolute inset-0 origin-right bg-globe-land"
                    style={resting.erase}
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
