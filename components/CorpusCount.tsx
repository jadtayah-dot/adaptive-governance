'use client'

import { useLayoutEffect, useRef } from 'react'

import { DURATION, lerp, tween } from '@/lib/corpus-motion'

/**
 * A number that counts to its new value rather than swapping to it.
 *
 * Same clock and same easing as the bars, so the headline and the distribution
 * under it settle together. The bars carry this themselves, through the count
 * field on BarState; this is for the numbers that are not attached to a bar.
 *
 * The server renders the value, and the first client pass records it without
 * animating, so nothing counts up from nowhere on load. A tween that lands
 * while another is running starts from whatever is on screen rather than from
 * the value it was aiming at, so a fast run of selections does not jump.
 *
 * It is text rather than a transform, which is the one place the corpus departs
 * from transform and opacity. The element is held at tabular-nums by its
 * caller, so the width does not change and nothing reflows around it.
 */
export default function CorpusCount({ value }: { value: number }) {
  const el = useRef<HTMLSpanElement>(null)
  /** What is on screen right now, which is where the next tween starts. */
  const shown = useRef(value)
  const first = useRef(true)
  const cancel = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      shown.current = value
      return
    }
    cancel.current()
    const from = shown.current
    /*
      Put the old number back before the browser paints. React has just rendered
      the new one, and the tween's first frame does not land until the next
      animation frame, so without this the reader sees the answer for a frame and
      then watches it count to the answer it already showed. A layout effect runs
      before paint, so nothing of this is visible.
    */
    if (el.current) el.current.textContent = String(Math.round(from))

    cancel.current = tween((t) => {
      const at = lerp(from, value, t)
      shown.current = at
      if (el.current) el.current.textContent = String(Math.round(at))
    }, DURATION)
    return () => cancel.current()
  }, [value])

  return (
    <>
      {/*
        Two numbers, because this sits inside a live region.

        The visible one is written on every frame, and a live region reading
        every frame would announce forty numbers on the way to one. It is hidden
        from assistive technology and the settled value is carried beside it,
        which changes once per selection, so the announcement is the answer
        rather than the counting.
      */}
      <span ref={el} aria-hidden="true">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  )
}
