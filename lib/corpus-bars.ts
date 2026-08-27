'use client'

import { useEffect, useLayoutEffect, useRef, type PointerEvent, type RefObject } from 'react'

import { DURATION, clamp01, ease, lerp, prefersReducedMotion, tween } from './corpus-motion'

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

/**
 * How much of a block has to be on screen before its entrance plays. Low,
 * because the ranking is taller than the viewport and would otherwise never
 * reach a higher threshold at all.
 */
const ENTRANCE_VISIBLE = 0.08

/**
 * How far apart the first and last bar of a block start, in milliseconds.
 *
 * Long enough that the block reads as arriving rather than snapping, short
 * enough that the whole thing is over before a reader has finished looking at
 * it. No individual bar runs longer than DURATION.
 */
const ENTRANCE_SPREAD = 260

export type BarState = {
  /** 0 to 1 along the bar axis. */
  main: number
  /** Pixels down the page. Rank position, for a list that re ranks. */
  offset: number
  opacity: number
  /**
   * The count the bar stands for. Counted up rather than swapped, on the same
   * clock and the same easing as the bar, so the number and the length arrive
   * together instead of one jumping ahead of the other.
   *
   * This is the one thing here that is not a compositor property. It is a text
   * node on an element held at tabular-nums, so the width does not change and
   * nothing reflows around it.
   */
  count: number
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

/**
 * The handlers that decide which group is being pointed at.
 *
 * One move listener on the list, not an enter listener on every row, and it
 * ignores any move that did not actually move.
 *
 * Rows used to carry onMouseEnter. Enter fires whenever a row arrives under the
 * pointer, and scrolling a list under a pointer that is sitting still does
 * exactly that: every row that slid past set a preview, so every other bar on
 * the page was cut back to whatever had just gone under the cursor, over and
 * over, for the whole scroll. Reported as the bars rushing through and drawing
 * back, and that is what it was.
 *
 * A scroll under a still pointer also makes the browser re dispatch a move at
 * the same coordinates so that :hover can be recomputed, which is why the
 * coordinates are compared rather than trusted.
 */
export function usePointerPreview(
  group: string,
  onPreview: (at: { group: string; key: string } | null) => void
) {
  const last = useRef({ x: -1, y: -1 })
  return {
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.clientX === last.current.x && event.clientY === last.current.y) return
      last.current = { x: event.clientX, y: event.clientY }
      const target = event.target as HTMLElement | null
      const row = target?.closest?.('[data-bar]') as HTMLElement | null
      const key = row?.dataset.bar
      if (key) onPreview({ group, key })
    },
    onPointerLeave: () => onPreview(null),
    onBlur: () => onPreview(null),
  }
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
  /** Whether the entrance has played. It plays once, or not at all. */
  const entered = useRef(false)
  /**
   * The targets the last real pass ran against. Null until the first one, and
   * compared by identity, so an effect that re-ran without the data changing is
   * ignored rather than mistaken for a selection.
   */
  const previous = useRef<ReadonlyMap<string, BarState> | null>(null)
  /** The latest targets, for the entrance, which is set up once. */
  const latest = useRef(targets)

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

      const count = row.querySelector<HTMLElement>('[data-part="count"]')
      // Grouped, because the counter also runs the screening funnel, where the
      // first figure is 6,481 and writing it as 6481 loses the separator the
      // server rendered and the copy beside it uses.
      if (count) count.textContent = Math.round(state.count).toLocaleString('en')

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
    /*
      An effect that ran again without the targets changing is not a selection
      change, and must not be treated as one.

      React invokes layout effects twice on mount in development. The second
      invocation was falling through to the selection branch, which disarms the
      entrance and plays it on the spot, so every block on the page animated
      about a third of a second after load and none of them was on screen when
      it did. Measured: the year strip, two thousand nine hundred pixels below
      the fold, grew from nothing to full between 366ms and 701ms, and then sat
      still when it was finally scrolled to.

      Identity is the right test here because targets is a useMemo: it is a new
      map when the data behind it changes and the same map when it does not.
    */
    latest.current = targets
    if (previous.current === targets) return
    const arriving = previous.current === null
    previous.current = targets

    cancel.current()

    /*
      Arrival.

      The first pass used to do nothing but record the state the server had
      rendered, on the grounds that nothing should count up from nowhere on
      load. That was wrong in practice: a reader who lands on the page and does
      not touch a filter sees no motion at all, and reasonably concludes there
      is none.

      So the bars are drawn empty and grown, and the counts are run up from
      zero. The emptying happens in a layout effect, which is before paint, so
      the full length the server rendered is never on screen: without that there
      is a frame of the answer, then a jump to nothing, then a grow back to it.

      It waits for the block to be looked at rather than firing on load. The
      ranking, the four breakdowns and the year strip are spread down a long
      page, and an entrance that plays while a block is two screens below the
      fold has not been seen.
    */
    if (arriving) {
      first.current = false

      if (prefersReducedMotion()) {
        for (const [key, state] of targets) applied.current.set(key, state)
        entered.current = true
        return
      }

      const empty = new Map<string, BarState>()
      for (const [key, to] of targets) empty.set(key, { ...to, main: 0, count: 0 })
      paint(empty)
      return
    }

    // A selection changed before the block was ever looked at. The entrance is
    // moot now, so it is marked spent rather than left to fire over the top.
    entered.current = true

    const from = new Map(applied.current)
    /*
      Put the old state back before the browser paints.

      React has just rendered the new count into the text nodes, and the tween's
      first frame does not land until the next animation frame, so without this
      the reader sees the answer for one frame and then watches it count to the
      answer it already showed. This runs in a layout effect, so it is before
      paint and nothing is visible.
    */
    paint(from)

    cancel.current = tween((t) => {
      const at = new Map<string, BarState>()
      for (const [key, to] of targets) {
        const start = from.get(key) ?? to
        at.set(key, {
          main: lerp(start.main, to.main, t),
          offset: lerp(start.offset, to.offset, t),
          opacity: lerp(start.opacity, to.opacity, t),
          count: lerp(start.count, to.count, t),
        })
      }
      paint(at)
    }, DURATION)
  }, [targets]) // eslint-disable-line react-hooks/exhaustive-deps

  /*
    Arm the entrance, and play it when the block is actually looked at.

    In its own effect rather than inside the one above, because that one returns
    no cleanup for the arming and the unmount cleanup was killing it: React
    simulates a remount on mount in development, so the observer was created,
    disconnected, and never rebuilt. The bars sat empty and nothing ever grew
    them. Here the setup and the teardown are the same effect, so a remount
    re-arms.

    The latest targets are read from a ref, because this runs once and the data
    behind it changes.
  */
  useEffect(() => {
    const root = container.current
    if (!root || entered.current || prefersReducedMotion()) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entered.current || !entries.some((e) => e.isIntersecting)) return
        entered.current = true
        io.disconnect()
        const to = latest.current
        const from = new Map(applied.current)
        /*
          Staggered, unlike a change of selection.

          Sixty six bars all starting and stopping together is a single event
          the eye reads as a snap, and it was reported as rushing through. Given
          slightly different start times they read as arriving. The order is the
          order the list is in, which for the ranking is most studied first, so
          the longest bar leads.

          A selection change is not staggered. That is a reply to a click and
          has to feel immediate; this is an entrance and has room to be one.

          No bar moves for longer than DURATION. What the spread lengthens is
          the group, not any bar in it.
        */
        const keys = [...to.keys()]
        const last = Math.max(keys.length - 1, 1)
        cancel.current = tween((_, raw) => {
          const elapsed = raw * (DURATION + ENTRANCE_SPREAD)
          const at = new Map<string, BarState>()
          keys.forEach((key, index) => {
            const end = to.get(key)!
            const begin = from.get(key) ?? end
            const delay = (index / last) * ENTRANCE_SPREAD
            const t = ease(clamp01((elapsed - delay) / DURATION))
            at.set(key, {
              ...end,
              main: lerp(begin.main, end.main, t),
              count: lerp(begin.count, end.count, t),
            })
          })
          paint(at)
        }, DURATION + ENTRANCE_SPREAD)
      },
      { threshold: ENTRANCE_VISIBLE },
    )
    io.observe(root)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
