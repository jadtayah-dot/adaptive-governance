/**
 * The motion on /corpus.
 *
 * `globals.css` switches CSS transitions and animations off across the whole
 * site, so nothing acquires motion by accident. The globe sequence gets around
 * that by writing inline style from JavaScript, and so does this: the bars are
 * tweened here and their transform is written straight onto the element.
 *
 * Transform and opacity only, in line with DESIGN.md. A bar changes length by
 * scaleX from its left edge and changes rank by translateY, so neither a layout
 * nor a paint is triggered by the animation.
 */

/** Under the 400ms the brief sets, and long enough to be followed. */
export const DURATION = 320

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Ease out cubic. Fast at the start, so the new ordering is legible early. */
export function ease(t: number) {
  return 1 - (1 - t) ** 3
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

/**
 * Calls `onFrame` with an eased 0 to 1 for `duration`, then once more with
 * exactly 1. Returns a cancel function. Under reduced motion it calls `onFrame`
 * once with 1 and never schedules a frame, so the end state is the only state
 * ever painted rather than the animation being played fast.
 */
/**
 * `onFrame` is given the eased position and, beside it, the raw linear one.
 *
 * The raw value is what a staggered run needs: each bar has to work out where
 * it is against a clock the whole group shares, and easing the group clock
 * before splitting it would ease the delays as well as the bars.
 */
export function tween(
  onFrame: (t: number, raw: number) => void,
  duration = DURATION
): () => void {
  if (prefersReducedMotion() || duration <= 0) {
    onFrame(1, 1)
    return () => {}
  }

  let raf = 0
  let start: number | null = null

  const step = (now: number) => {
    if (start === null) start = now
    const elapsed = now - start
    if (elapsed >= duration) {
      onFrame(1, 1)
      return
    }
    const raw = elapsed / duration
    onFrame(ease(raw), raw)
    raf = requestAnimationFrame(step)
  }

  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * The fill for a bar holding `value` where the largest bar holds `max`.
 *
 * It is the globe's own scale, so a country reads the same way on both, and it
 * is expressed as a `color-mix` between the two tokens rather than as a computed
 * value, so the component never holds a raw colour and the server and the client
 * render the same string. Both ends clear 3:1 against the page and every channel
 * falls monotonically between them, so every step of the walk clears it too.
 * `tests/palette.py` checks that.
 */
export function fill(value: number, max: number) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const percent = (share * 100).toFixed(1)
  return `color-mix(in srgb, var(--ag-globe-fill-max) ${percent}%, var(--ag-globe-fill-min))`
}
