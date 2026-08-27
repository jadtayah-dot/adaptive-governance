'use client'

import { useMemo, useRef } from 'react'

import {
  restingStyle,
  useBars,
  usePointerPreview,
  type BarState,
  type Brush,
} from '@/lib/corpus-bars'
import { fill } from '@/lib/corpus-motion'

/**
 * The corpus by year of publication.
 *
 * Columns rather than rows, because the axis is time and time reads left to
 * right. It is the same instrument as the other breakdowns otherwise: one
 * column is one choice, choices are additive, and resting on a group elsewhere
 * on the page cuts every column back to the part of itself that group holds.
 *
 * Years run continuously from the first in the corpus to the last, including
 * any the corpus does not reach, because a gap in a run of years is a fact
 * about the literature and a list that closes up the gaps hides it.
 */

export type YearColumn = {
  key: string
  label: string
  value: number
}

const STRIP_HEIGHT = 72

export default function CorpusYears({
  columns,
  selected,
  brush,
  onToggle,
  onPreview,
  unit,
  group,
  tickEvery,
}: {
  columns: YearColumn[]
  selected: ReadonlySet<string>
  brush: Brush
  onToggle: (key: string) => void
  onPreview: (at: { group: string; key: string } | null) => void
  unit: (n: number) => string
  group: string
  /** A label under every nth column. Seventeen labels in a row do not fit. */
  tickEvery: number
}) {
  const container = useRef<HTMLUListElement>(null)
  const max = columns.reduce((acc, column) => Math.max(acc, column.value), 0)

  const targets = useMemo(() => {
    const out = new Map<string, BarState>()
    for (const column of columns) {
      out.set(column.key, {
        offset: 0,
        main: max > 0 ? column.value / max : 0,
        opacity: 1,
        count: column.value,
      })
    }
    return out
  }, [columns, max])

  useBars(container, targets, brush, 'y')
  const pointer = usePointerPreview(group, onPreview)

  return (
    <div className="overflow-x-auto">
      <ul
        ref={container}
        className="flex items-stretch gap-px"
        {...pointer}
      >
        {columns.map((column, index) => {
          const at = targets.get(column.key)!
          const resting = restingStyle(at, brush, column.key, 'y')
          const isSelected = selected.has(column.key)
          const showTick = index % tickEvery === 0 || index === columns.length - 1
          // min-w-6 rather than a width computed on the list: 24 pixels is the
          // minimum target size, and a minimum set on the container would have
          // to know about the gaps between the columns to reach it. Below about
          // 420 the strip overflows and its wrapper scrolls.
          return (
            <li
              key={column.key}
              data-bar={column.key}
              data-value={column.value}
              className="min-w-6 flex-1"
            >
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${column.label}, ${column.value} ${unit(column.value)}`}
                onClick={() => onToggle(column.key)}
                onFocus={() => onPreview({ group, key: column.key })}
                className={`block w-full ${isSelected ? 'outline outline-2 outline-accent' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`block text-center text-[0.8rem] tabular-nums ${
                    isSelected ? 'font-semibold text-ink' : 'text-ink-muted'
                  }`}
                >
                  {/* A hard space where there is nothing to say, so every column
                      is the same height and the tracks share a baseline. An
                      empty label collapses its line box and drops the column. */}
                  {/* The counter writes over this span. It writes a zero
                      rather than a space, which is the honest thing under a
                      selection the year holds nothing for. */}
                  <span data-part="count">
                    {column.value > 0 ? column.value : ' '}
                  </span>
                </span>
                {/* Same track and same scale as the horizontal bars, stood up. */}
                <span
                  className="relative mt-1 block overflow-hidden border border-rule bg-globe-land"
                  style={{ height: STRIP_HEIGHT }}
                >
                  <span
                    data-part="fill"
                    aria-hidden="true"
                    className="absolute inset-0 origin-bottom"
                    style={{ ...resting.fill, backgroundColor: fill(column.value, max) }}
                  />
                  <span
                    data-part="erase"
                    aria-hidden="true"
                    className="absolute inset-0 origin-top bg-globe-land"
                    style={resting.erase}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 block text-center text-[0.8rem] tabular-nums ${
                    isSelected ? 'font-semibold text-ink' : 'text-ink-muted'
                  }`}
                >
                  {showTick ? column.label : ' '}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
