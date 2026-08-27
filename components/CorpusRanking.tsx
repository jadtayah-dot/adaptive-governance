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
 * The ranking of countries by study count.
 *
 * Rows are absolutely positioned inside a container of fixed height and never
 * reordered in the DOM. Rank is carried by translateY and length by scaleX from
 * the left edge, so re ranking is a transform on a stable list rather than React
 * moving nodes, and a row keeps its focus and its identity while it moves.
 *
 * Rows that fall to zero under a selection stay in place at reduced opacity
 * rather than being removed. A country dropping out is part of what a selection
 * shows, and a list that changes length cannot be followed.
 */

export type RankRow = {
  key: string
  label: string
  /** Count under the current selection. */
  value: number
  /** Count over the whole corpus. Fixes the resting order and breaks ties. */
  baseline: number
}

const ROW_HEIGHT = 28

export default function CorpusRanking({
  rows,
  selected,
  brush,
  onToggle,
  onPreview,
  unit,
  emptyLabel,
  group,
  limit,
}: {
  /** In resting order. This is the DOM order and it never changes. */
  rows: RankRow[]
  selected: ReadonlySet<string>
  brush: Brush
  onToggle: (key: string) => void
  onPreview: (at: { group: string; key: string } | null) => void
  /** Read out after the count, so the number is not bare to a screen reader. */
  unit: (n: number) => string
  emptyLabel: string
  group: string
  /**
   * How many rows to show. Everything below the cut stays in the DOM so the
   * ranking can animate across the cut, and is taken out of the accessibility
   * tree and the tab order so it is not read out or reachable while hidden.
   */
  limit?: number
}) {
  const container = useRef<HTMLUListElement>(null)
  const max = rows.reduce((acc, row) => Math.max(acc, row.value), 0)
  const cut = limit ?? rows.length
  const shown = Math.min(cut, rows.length)

  /** Rank under the current selection, by key. */
  const ranks = useMemo(() => {
    // Ties fall back to the resting order, so a selection that flattens the
    // counts does not shuffle the list.
    const ordered = rows
      .map((row, index) => ({ row, index }))
      .sort(
        (a, b) => b.row.value - a.row.value || b.row.baseline - a.row.baseline || a.index - b.index
      )
    return new Map(ordered.map(({ row }, rank) => [row.key, rank]))
  }, [rows])

  const targets = useMemo(() => {
    const out = new Map<string, BarState>()
    for (const row of rows) {
      const rank = ranks.get(row.key)!
      const hidden = rank >= cut
      out.set(row.key, {
        // Rows below the cut stack on the last visible row rather than running
        // on down the page, so nothing slides in from far away when the cut
        // moves.
        offset: Math.min(rank, cut) * ROW_HEIGHT,
        main: max > 0 ? row.value / max : 0,
        opacity: hidden ? 0 : row.value > 0 ? 1 : 0.4,
        count: row.value,
      })
    }
    return out
  }, [rows, ranks, max, cut])

  useBars(container, targets, brush, 'x')
  const pointer = usePointerPreview(group, onPreview)

  if (rows.length === 0) return <p className="text-[0.9rem] text-ink-muted">{emptyLabel}</p>

  return (
    <ul
      ref={container}
      className="relative w-full"
      style={{ height: shown * ROW_HEIGHT }}
      {...pointer}
    >
      {rows.map((row) => {
        const at = targets.get(row.key)!
        const resting = restingStyle(at, brush, row.key, 'x')
        const isSelected = selected.has(row.key)
        const hidden = ranks.get(row.key)! >= cut
        return (
          <li
            key={row.key}
            data-bar={row.key}
            // The count the row stands for, whatever the animation is showing.
            data-value={row.value}
            aria-hidden={hidden ? true : undefined}
            className="absolute inset-x-0 top-0"
            style={{
              height: ROW_HEIGHT,
              transform: `translate3d(0, ${at.offset}px, 0)`,
              opacity: at.opacity,
              pointerEvents: hidden ? 'none' : undefined,
            }}
          >
            <button
              type="button"
              aria-pressed={isSelected}
              tabIndex={hidden ? -1 : undefined}
              onClick={() => onToggle(row.key)}
              onFocus={() => onPreview({ group, key: row.key })}
              className={`flex h-full w-full items-center gap-2 pr-1 text-left sm:gap-3 ${
                isSelected ? 'outline outline-2 outline-accent' : ''
              }`}
            >
              <span
                // 9rem is what the longest name in the corpus, United States of
                // America, needs at 390. Nothing truncates at any width.
                className={`w-[9rem] shrink-0 truncate text-[0.8rem] sm:w-[13rem] ${
                  isSelected ? 'font-semibold text-ink' : 'text-ink-muted'
                }`}
                title={row.label}
              >
                {row.label}
              </span>
              {/*
                The track is the globe's own colour for land the corpus does not
                reach, not the raised surface: the lightest bar is 2.90:1 on the
                raised surface and under the 3:1 non text minimum, and 3.17:1 on
                this. The extent of the scale is then carried by the rule, which
                clears 3:1 on the page, rather than by a fill the bar cannot be
                told apart from.
              */}
              <span className="relative h-4 min-w-0 flex-1 overflow-hidden border border-rule bg-globe-land">
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
              {/*
                Two numbers, because the visible one is animated.

                A block below the fold is drawn empty and grows when it is
                scrolled to, so its visible count reads zero until then. That is
                fine to look at and wrong to be told, so the count carried for
                assistive technology is the real one and never moves.
              */}
              <span className="w-7 shrink-0 text-right text-[0.8rem] tabular-nums text-ink">
                <span data-part="count" aria-hidden="true">
                  {row.value}
                </span>
                <span className="sr-only">
                  {row.value} {unit(row.value)}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
