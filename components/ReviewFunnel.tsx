'use client'

import { useMemo, useRef } from 'react'

import review from '@/content/review.json'
import { restingStyle, useBars, type BarState } from '@/lib/corpus-bars'
import { fill } from '@/lib/corpus-motion'

/**
 * The screening funnel, beside the paragraph that states it.
 *
 * 6,481 screened, 272 meeting the inclusion criteria, 217 analysed. The
 * paragraph says those numbers and this is the same three numbers as a shape,
 * so a reader sees how steep the narrowing is without doing the arithmetic.
 *
 * The scale is linear and deliberately so. 217 of 6,481 is three percent, which
 * makes the last bar a sliver, and that sliver is the finding: a very large
 * search reduced to a very small corpus by a strict definition. A log scale
 * would make the three bars look comparable, which they are not.
 *
 * It shares the corpus bar machinery, so it grows when it is scrolled to, its
 * numbers count rather than swap, and it holds still under reduced motion.
 */

const STAGES = review.funnel.stages

export default function ReviewFunnel() {
  const container = useRef<HTMLOListElement>(null)
  const max = STAGES[0].count

  const targets = useMemo(() => {
    const out = new Map<string, BarState>()
    for (const stage of STAGES) {
      out.set(stage.key, { offset: 0, main: stage.count / max, opacity: 1, count: stage.count })
    }
    return out
  }, [max])

  useBars(container, targets, null, 'x')

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
      <figcaption className="text-[1rem] font-semibold">{review.funnel.heading}</figcaption>
      <ol ref={container} className="mt-4 space-y-5">
        {STAGES.map((stage) => {
          const at = targets.get(stage.key)!
          const resting = restingStyle(at, null, stage.key, 'x')
          return (
            <li key={stage.key} data-bar={stage.key} data-value={stage.count}>
              <p className="flex items-baseline justify-between gap-4">
                <span className="text-[0.9rem] text-ink-muted">{stage.label}</span>
                <span className="text-[1.25rem] font-semibold tabular-nums text-ink">
                  {/* The visible number counts up, so the real one is carried
                      beside it for assistive technology. */}
                  <span data-part="count" aria-hidden="true">
                    {stage.count.toLocaleString('en')}
                  </span>
                  <span className="sr-only">{stage.count.toLocaleString('en')}</span>
                </span>
              </p>
              <span className="relative mt-2 block h-5 overflow-hidden border border-rule bg-globe-land">
                <span
                  data-part="fill"
                  aria-hidden="true"
                  className="absolute inset-0 origin-left"
                  style={{ ...resting.fill, backgroundColor: fill(stage.count, max) }}
                />
                <span
                  data-part="erase"
                  aria-hidden="true"
                  className="absolute inset-0 origin-right bg-globe-land"
                  style={resting.erase}
                />
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-[0.8rem] leading-snug text-ink-muted">{review.funnel.note}</p>
    </figure>
  )
}
