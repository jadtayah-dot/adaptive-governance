'use client'

import { useMemo, useRef } from 'react'

import review from '@/content/review.json'
import { restingStyle, useBars, type BarState } from '@/lib/corpus-bars'
import { fill } from '@/lib/corpus-motion'

/**
 * The corpus by year of publication, on the homepage.
 *
 * A reading of the same corpus the globe is drawn from, and the finding is the
 * shape: this literature is recent and it is still growing. /corpus carries the
 * same distribution as a control that filters everything else; this is the
 * figure, with nothing to click.
 *
 * The counts are computed on the server from content/corpus.json and passed in,
 * so half a megabyte of records does not reach the browser for a chart of
 * seventeen numbers.
 */

export type YearCount = { year: string; count: number }

export default function CorpusYearsFigure({ years }: { years: YearCount[] }) {
  const container = useRef<HTMLUListElement>(null)
  const max = years.reduce((acc, y) => Math.max(acc, y.count), 0)

  const targets = useMemo(() => {
    const out = new Map<string, BarState>()
    for (const y of years) {
      out.set(y.year, { offset: 0, main: max > 0 ? y.count / max : 0, opacity: 1, count: y.count })
    }
    return out
  }, [years, max])

  useBars(container, targets, null, 'y')

  /*
    On a card, not straight on the globe.

    These sit in the corpus section, which is exactly where the globe comes
    forward to full strength on its way into the argument. Measured at 1440, a
    year label was 2.76:1 against a lit polygon behind it. The sequence passages
    solved the same problem the same way: once a saturated map fills the frame,
    placement can decide where text goes but not whether it is legible.
  */
  return (
    <figure className="m-0 border border-rule bg-surface p-6">
      <figcaption className="text-[1rem] font-semibold">{review.years.heading}</figcaption>
      <ul ref={container} className="mt-4 flex items-stretch gap-px">
        {years.map((y, index) => {
          const at = targets.get(y.year)!
          const resting = restingStyle(at, null, y.year, 'y')
          // Seventeen labels in a row do not fit, so every fifth and the last.
          const tick = index % 5 === 0 || index === years.length - 1
          return (
            <li key={y.year} data-bar={y.year} data-value={y.count} className="min-w-0 flex-1">
              <span
                aria-hidden="true"
                className="block text-center text-[0.7rem] tabular-nums text-ink-muted"
              >
                <span data-part="count">{y.count > 0 ? y.count : ' '}</span>
              </span>
              <span className="relative mt-1 block h-16 overflow-hidden border border-rule bg-globe-land">
                <span
                  data-part="fill"
                  aria-hidden="true"
                  className="absolute inset-0 origin-bottom"
                  style={{ ...resting.fill, backgroundColor: fill(y.count, max) }}
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
                className="mt-1 block text-center text-[0.7rem] tabular-nums text-ink-muted"
              >
                {tick ? y.year : ' '}
              </span>
              {/* The figure is a picture for a sighted reader and a sentence for
                  everyone else, rather than seventeen unlabelled numbers. */}
              <span className="sr-only">
                {y.year}: {y.count}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-[0.8rem] leading-snug text-ink-muted">{review.years.note}</p>
    </figure>
  )
}
