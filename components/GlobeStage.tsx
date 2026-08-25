'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import GlobeMount from './GlobeMount'
import copy from '@/content/globe.json'
import {
  LABEL_CLEAR,
  LABEL_REVEAL,
  MIN_LIVE_WIDTH,
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

  Below MIN_LIVE_WIDTH none of this runs. The layout is neutralised in CSS, so
  it is correct from the first paint with no hydration branch, and the WebGL
  scene is never mounted at all. What the reader gets instead is ordinary page
  content, in app/page.tsx.

  Nothing in here writes to React state per frame. The scroll position goes into
  a ref that the globe reads on the gsap ticker, and the annotations are written
  straight to style. Transform and opacity only.
*/

/** Nothing until the width is known. Then live, static, or the capture mode. */
type Mode = 'unknown' | 'live' | 'static' | 'still'

/*
  Which path this viewport gets. The viewport is an external system, so this
  subscribes to it rather than mirroring it into state in an effect. The server
  cannot know the width, so it renders the same markup either way and this
  settles it on the client; the only thing it decides is whether the scene is
  built at all, since the layout is already correct from CSS.
*/
function subscribeToWidth(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function readMode(): Mode {
  if (new URLSearchParams(window.location.search).get('globe') === 'still') return 'still'
  return window.innerWidth >= MIN_LIVE_WIDTH ? 'live' : 'static'
}

function serverMode(): Mode {
  return 'unknown'
}

/** Opacity and a short lift. Both compositor properties, so nothing reflows. */
function fade(el: HTMLElement | null, opacity: number, lift: number) {
  if (!el) return
  el.style.opacity = opacity.toFixed(3)
  el.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0)`
}

/*
  Fully opaque, and on the raised surface, so it reads as one of the page's own
  cards rather than as a translucent overlay.
*/
const PANEL = 'border-l-2 border-l-accent bg-surface-raised px-3 py-2'

/*
  The annotation column, in the gutter to the right of the measure. The width is
  what is left over at MIN_LIVE_WIDTH once the measure has taken its 68
  characters, so the column never enters the measure at any width that runs the
  live scene. Both stacks use the same box and never hold anything at the same
  time: the labels have cleared before the first note arrives.
*/
const ANNOTATIONS = 'absolute top-[26%] right-10 w-[13rem] space-y-3'

export default function GlobeStage({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const labels = useRef<(HTMLLIElement | null)[]>([])
  const note = useRef<HTMLParagraphElement>(null)
  const nodesNote = useRef<HTMLParagraphElement>(null)
  const mode = useSyncExternalStore(subscribeToWidth, readMode, serverMode)

  useEffect(() => {
    if (mode === 'unknown' || mode === 'static') return

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

    // Capture mode holds the last frame of the argument and nothing else.
    if (mode === 'still') {
      progress.current = 1
      return
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
  }, [mode])

  const capturing = mode === 'still'

  return (
    <div ref={container} className="relative">
      {/*
        The globe layer. Sticky, so it holds at the top of the viewport for the
        whole container and comes to rest flush with the globe well at the end.
        Pointer events are off for the whole argument phase: the globe takes
        hover and click at the handover, not before, and the prose scrolling
        over it has to stay clickable.

        In capture mode it covers the page instead, so the script can screenshot
        it and get the scene on the page ground and nothing else.
      */}
      <div
        aria-hidden="true"
        data-globe-still={capturing ? '' : undefined}
        className={
          capturing
            ? 'fixed inset-0 z-50 bg-surface'
            : 'pointer-events-none sticky top-0 h-screen w-full overflow-hidden max-[1199px]:hidden'
        }
      >
        <div className="absolute inset-0">
          {mode === 'live' || capturing ? (
            <GlobeMount progress={progress} still={capturing} />
          ) : null}
        </div>

        {/*
          The sphere is offset right in the canvas so the measure is never over
          a lit polygon. This only has to hold the left column down, and it is
          deliberately light. See --ag-globe-scrim in globals.css.
        */}
        {capturing ? null : (
          <div className="absolute inset-0" style={{ background: 'var(--ag-globe-scrim)' }} />
        )}
      </div>

      {/*
        The prose, pulled back over the layer above it. The sticky element still
        occupies its 100vh slot in flow, so without this the argument would
        start a screen below the top of the page. Below MIN_LIVE_WIDTH there is
        no sticky element and nothing to pull back over.
      */}
      <div className={`relative -mt-[100vh] max-[1199px]:mt-0 ${capturing ? 'invisible' : ''}`}>
        {children}
      </div>

      {/*
        The annotations, fixed to the viewport and last in paint order so the
        section rules and the globe well frame pass behind them rather than
        through them. Only on the live path: below MIN_LIVE_WIDTH the same copy
        is ordinary page content instead, so it never lands on the measure.
      */}
      {capturing ? null : (
        <div className="pointer-events-none fixed inset-0 z-10 max-[1199px]:hidden">
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
            <p
              ref={note}
              style={{ opacity: 0 }}
              className={`${PANEL} text-[0.9rem] leading-relaxed`}
            >
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
      )}
    </div>
  )
}
