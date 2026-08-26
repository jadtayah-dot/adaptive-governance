'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

import { DURATION, lerp, tween } from './corpus-motion'

/**
 * The bar behaviour shared by the ranking, the four breakdowns and the year
 * strip: tween on a change of selection, and preview on a hover or a focus.
 *
 * Every bar is three elements. A track, which carries the extent of the scale
 * and never moves. A fill, scaled from the low end of the axis, which carries
 * the count. And an erase, scaled from the high end in the colour of the track,
 * which covers whatever the fill has drawn past the point the preview reaches.
 *
 * With nothing hovered the erase covers exactly the part of the track the fill
 * does not, so it is invisible. Resting on a group elsewhere on the page sets a
 * fraction for every bar, the erase grows, and each bar is cut back to the part
 * of itself that group holds. Choosing the group then makes that the selection,
 * and the bar tweens to the same place it was already showing.
 *
 * Elements are found by data attribute rather than held in a map of refs. There
 * are around a hundred and thirty bars on the page and one query per change is
 * cheaper, in code and at runtime, than a hundred and thirty ref callbacks
 * rebound on every render.
 */

export type BarState = {
  /** 0 to 1 along the bar axis. */
  main: number
  /** Pixels down the page. Rank position, for a list that re ranks. */
  offset: number
  opacity: number
}

/** Key to the fraction of that bar the hovered group holds. 1 means no preview. */
export type Brush = ReadonlyMap<string, number> | null

/**
 * scaleX(0) collapses the element and some engines then skip it altogether, so
 * an empty bar is held at a hair and hidden by the opacity of its row instead.
 */
const HAIR = 0.0001

function scale(axis: 'x' | 'y', value: number) {
  const v = Math.max(value, HAIR)
  return axis === 'x' ? `scaleX(${v})` : `scaleY(${v})`
}

export function useBars(
  container: RefObject<HTMLElement | null>,
  targets: ReadonlyMap<string, BarState>,
  brush: Brush,
  axis: 'x' | 'y' = 'x'
) {
  const applied = useRef(new Map<string, BarState>())
  /** Read inside the tween, so a preview that lands mid tween is not lost. */
  const brushRef = useRef<Brush>(brush)
  const cancel = useRef<() => void>(() => {})
  const first = useRef(true)

  const paint = (at: ReadonlyMap<string, BarState>) => {
    const root = container.current
    if (!root) return
    for (const row of root.querySelectorAll<HTMLElement>('[data-bar]')) {
      const key = row.dataset.bar!
      const state = at.get(key)
      if (!state) continue
      if (state.offset !== 0 || row.style.transform !== '') {
        row.style.transform = `translate3d(0, ${state.offset}px, 0)`
      }
      row.style.opacity = String(state.opacity)

      const fill = row.querySelector<HTMLElement>('[data-part="fill"]')
      const erase = row.querySelector<HTMLElement>('[data-part="erase"]')
      if (fill) fill.style.transform = scale(axis, state.main)
      // The erase covers from the far end back to wherever the preview reaches.
      // With no preview that is exactly the empty part of the track.
      if (erase) {
        const held = brushRef.current?.get(key) ?? 1
        erase.style.transform = scale(axis, 1 - state.main * held)
      }
      applied.current.set(key, state)
    }
  }

  // A hover or a focus. The ref is refreshed here rather than during render,
  // and this effect is declared before the tween so that on a render where both
  // the selection and the preview changed, the tween reads the fresh preview.
  //
  // Written straight out with no tween of its own: a preview that eases in lags
  // behind the pointer and stops reading as a response to it.
  useLayoutEffect(() => {
    brushRef.current = brush
    const root = container.current
    if (!root || first.current) return
    for (const row of root.querySelectorAll<HTMLElement>('[data-bar]')) {
      const key = row.dataset.bar!
      const state = applied.current.get(key)
      const erase = row.querySelector<HTMLElement>('[data-part="erase"]')
      if (!state || !erase) continue
      erase.style.transform = scale(axis, 1 - state.main * (brush?.get(key) ?? 1))
    }
  }, [brush]) // eslint-disable-line react-hooks/exhaustive-deps

  // A change of selection. Tweened, because the ordering and the lengths both
  // change and a jump between two rankings cannot be followed.
  useLayoutEffect(() => {
    cancel.current()

    // The server rendered the resting state already. Nothing animates into the
    // position it is already in, so the first pass only records it.
    if (first.current) {
      first.current = false
      for (const [key, state] of targets) applied.current.set(key, state)
      return
    }

    const from = new Map(applied.current)
    cancel.current = tween((t) => {
      const at = new Map<string, BarState>()
      for (const [key, to] of targets) {
        const start = from.get(key) ?? to
        at.set(key, {
          main: lerp(start.main, to.main, t),
          offset: lerp(start.offset, to.offset, t),
          opacity: lerp(start.opacity, to.opacity, t),
        })
      }
      paint(at)
    }, DURATION)
  }, [targets]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => cancel.current(), [])
}

/**
 * The resting transform for a bar, so the server and the first client render
 * agree and nothing jumps on hydration.
 */
export function restingStyle(state: BarState, brush: Brush, key: string, axis: 'x' | 'y' = 'x') {
  const held = brush?.get(key) ?? 1
  return {
    fill: { transform: scale(axis, state.main) },
    erase: { transform: scale(axis, 1 - state.main * held) },
  }
}
