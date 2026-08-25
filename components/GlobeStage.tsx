'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import GlobeMount from './GlobeMount'
import copy from '@/content/globe.json'
import {
  LABEL_CLEAR,
  LABEL_REVEAL,
  NODES_NOTE_REVEAL,
  NOTE_REVEAL,
  easeOut,
  span,
} from '@/lib/globe-sequence'

/*
  The pinned container. It runs from the top of the hero to the bottom of the
  globe well in section five, and it holds the only globe instance on the page.

  The pin is CSS sticky rather than a ScrollTrigger pin. ScrollTrigger's pin
  works by taking the element out of flow into a spacer, which fights the
  negative margin that puts the prose over the globe; sticky needs neither and
  releases at the container bottom on its own, which is exactly where the
  handover belongs. ScrollTrigger is still what reports the position.

  Three layers, in paint order. The globe and its scrim are the ground. The
  prose passes over them. The annotations sit above the prose, because they are
  annotations on the globe and the section rules and borders scrolling past
  would otherwise be drawn straight through them.

  Nothing in here writes to React state. The scroll position goes into a ref
  that the globe reads on the gsap ticker, and the annotations are written
  straight to style. Transform and opacity only.
*/

/** Opacity and a short lift. Both compositor properties, so nothing reflows. */
function fade(el: HTMLElement | null, opacity: number, lift: number) {
  if (!el) return
  el.style.opacity = opacity.toFixed(3)
  el.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0)`
}

/*
  Fully opaque, and on the raised surface, so it reads as one of the page's own
  cards rather than as a translucent overlay. A partly transparent panel is fine
  over the sphere and unreadable over prose, and under 900 it lands on prose.
*/
const PANEL = 'border-l-2 border-l-accent bg-surface-raised px-3 py-2'

/*
  Where the annotation stacks sit. Both stacks use the same box, and they never
  hold anything at the same time: the labels have cleared before the first note
  arrives. Under 900 this anchors to the foot of the viewport rather than to a
  right gutter that does not exist at that width.
*/
const ANNOTATIONS =
  'absolute right-6 bottom-6 left-6 space-y-3 ' +
  'min-[900px]:top-[26%] min-[900px]:right-10 min-[900px]:bottom-auto ' +
  'min-[900px]:left-auto min-[900px]:w-[15rem]'

export default function GlobeStage({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const labels = useRef<(HTMLLIElement | null)[]>([])
  const note = useRef<HTMLParagraphElement>(null)
  const nodesNote = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const paint = (p: number) => {
      // The three labels arrive one at a time as their shell detaches, and all
      // three clear the frame together before the camera starts down.
      const cleared = span(p, LABEL_CLEAR[0], LABEL_CLEAR[1])
      LABEL_REVEAL.forEach((at, i) => {
        const arrived = easeOut(span(p, at, at + 0.05))
        fade(labels.current[i], arrived * (1 - cleared), (1 - arrived) * 10)
      })

      // The line about the thin Gulf arrives with the descent and then holds,
      // because it is still true once the work package nodes are up.
      const shown = easeOut(span(p, NOTE_REVEAL[0], NOTE_REVEAL[1]))
      fade(note.current, shown, (1 - shown) * 10)

      const named = easeOut(span(p, NODES_NOTE_REVEAL[0], NODES_NOTE_REVEAL[1]))
      fade(nodesNote.current, named, (1 - named) * 10)
    }

    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm) {
      /*
        The deliberate alternative, not a switched off version: the globe holds
        the last stage, over Qatar with the five nodes up, and the labels and
        the notes are all present at once. No pin, no scrub, no rotation.
        PRODUCT.md asks for a fuller static path than this and it is still open.
      */
      progress.current = 1
      paint(1)
      return
    }

    gsap.registerPlugin(ScrollTrigger)

    // One scroll position shared between the two. Without this handshake Lenis
    // and ScrollTrigger read the page at different moments and the globe lags
    // the copy by a frame.
    const lenis = new Lenis({ autoRaf: false })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const trigger = ScrollTrigger.create({
      trigger: container.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress
        paint(self.progress)
      },
    })

    paint(0)

    return () => {
      trigger.kill()
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  }, [])

  return (
    <div ref={container} className="relative">
      {/*
        The globe layer. Sticky, so it holds at the top of the viewport for the
        whole container and comes to rest flush with the globe well at the end.
        Pointer events are off for the whole argument phase: the globe takes
        hover and click at the handover, not before, and the prose scrolling
        over it has to stay clickable.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-0 h-screen w-full overflow-hidden"
      >
        <div className="absolute inset-0">
          <GlobeMount progress={progress} />
        </div>

        {/*
          The sphere is offset right in the canvas so the measure is never over
          a lit polygon. This only has to hold the left column down, and it is
          deliberately light. See --ag-globe-scrim in globals.css.
        */}
        <div className="absolute inset-0" style={{ background: 'var(--ag-globe-scrim)' }} />
      </div>

      {/*
        The prose, pulled back over the layer above it. The sticky element still
        occupies its 100vh slot in flow, so without this the argument would
        start a screen below the top of the page.
      */}
      <div className="relative -mt-[100vh]">{children}</div>

      {/*
        The annotations, fixed to the viewport and last in paint order so the
        section rules and the globe well frame pass behind them rather than
        through them. Held clear of the measure on the right, over the sphere.
      */}
      <div className="pointer-events-none fixed inset-0 z-10">
        {/*
          Wide: a column in the right gutter, clear of the measure and over the
          sphere. Under 900 there is no gutter to put it in, so it anchors to
          the foot of the viewport across the full width instead of covering the
          measure. Same breakpoint as NARROW in components/Globe.tsx.
        */}
        <ul className={ANNOTATIONS}>
          {copy.shells.map((shell, i) => (
            <li
              key={shell.id}
              ref={(el) => {
                labels.current[i] = el
              }}
              style={{ opacity: 0 }}
              className={PANEL}
            >
              <p className="font-mono text-[0.9rem] text-accent">{shell.label}</p>
              <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-muted">{shell.gloss}</p>
            </li>
          ))}
        </ul>

        <div className={ANNOTATIONS}>
          <p ref={note} style={{ opacity: 0 }} className={`${PANEL} text-[0.9rem] leading-relaxed`}>
            {copy.descentNote}
          </p>
          {/*
            The second colour, on the globe, marking evidence this project is
            creating rather than evidence that exists. It names the five teal
            nodes, so it carries their colour rather than the page accent.
          */}
          <p
            ref={nodesNote}
            style={{ opacity: 0 }}
            className="border-l-2 border-l-globe-project bg-surface-raised px-3 py-2 text-[0.9rem] leading-relaxed"
          >
            {copy.nodesNote}
          </p>
        </div>
      </div>
    </div>
  )
}
