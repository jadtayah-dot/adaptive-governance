'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import CorpusPanel from './CorpusPanel'
import GlobeMount from './GlobeMount'
import copy from '@/content/globe.json'
import { HANDOVER_MS, MIN_LIVE_WIDTH, easeOut, span } from '@/lib/globe-sequence'

/*
  The pinned argument. It sits inside section five, where the copy says the
  globe is, and it holds the only globe instance on the page.

  The globe is the subject here, not a background. It fills the frame, nothing
  is laid over the middle of it, and the only text is the sequence naming what
  is happening at that moment. The long form prose is ordinary page above and
  below, not a column running past the sphere: a globe with a paragraph beside
  it that never refers to it reads as wallpaper, which is what this was.

  Contrast is still 4.5:1 and it is still binding. It is met by placing each
  passage where the sphere is not at that moment rather than by pushing the
  sphere aside or dimming it. A circle in a rectangle always leaves dark corners
  and the descent leaves a dark half; the passages move, the globe does not.

  The pin is CSS sticky rather than a ScrollTrigger pin. ScrollTrigger's pin
  takes the element out of flow into a spacer; sticky needs neither and releases
  at the container bottom on its own, which is where the handover belongs.

  Below MIN_LIVE_WIDTH none of this runs. The layout is neutralised in CSS, so
  it is correct from the first paint with no hydration branch, and the WebGL
  scene is never mounted at all.

  Nothing in here writes to React state per frame. The scroll position goes into
  a ref that the globe reads on the gsap ticker, and the passages are written
  straight to style. Transform and opacity only.
*/

/** Nothing until the width is known. Then live, static, or the capture mode. */
type Mode = 'unknown' | 'live' | 'static' | 'still'

/*
  Which path this viewport gets. The viewport is an external system, so this
  subscribes to it rather than mirroring it into state in an effect.
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
  The passages, in the order they arrive, with where each one sits.

  Placement is per passage and not a column, because the dark part of the frame
  moves through the sequence. The opening line sits under the sphere's lower
  curve. The three shell labels take three different corners as the shells
  separate outward. The descent line sits over the unlit half of the Gulf, which
  is the thing it is describing. The last line goes to the opposite corner from
  the nodes it names.

  `out` is null where a passage holds to the end of the sequence.
*/
interface Passage {
  key: string
  in: [number, number]
  out: [number, number] | null
  at: string
}

const PASSAGES: Passage[] = [
  { key: 'opening', in: [0.04, 0.1], out: [0.17, 0.22], at: 'bottom-16 left-12 w-[26ch]' },
  { key: 'shell-0', in: [0.25, 0.3], out: [0.47, 0.53], at: 'top-16 left-12 w-[22ch]' },
  {
    key: 'shell-1',
    in: [0.33, 0.38],
    out: [0.47, 0.53],
    at: 'top-16 right-12 w-[22ch] text-right',
  },
  {
    key: 'shell-2',
    in: [0.4, 0.45],
    out: [0.47, 0.53],
    at: 'bottom-16 right-12 w-[22ch] text-right',
  },
  { key: 'descent', in: [0.5, 0.56], out: null, at: 'bottom-10 right-14 w-[34ch] text-right' },
  { key: 'nodes', in: [0.82, 0.88], out: null, at: 'bottom-10 right-14 w-[34ch] text-right' },
]

/*
  Passages that share a position share one box and stack inside it, rather than
  each carrying an offset measured against the height of the one below. Copy
  edits change those heights, and a hand tuned offset would put text back over a
  lit polygon silently. `tests/globe contrast.py` would catch it, but not
  needing to be caught is better.
*/
const SLOTS = PASSAGES.reduce<{ at: string; items: Passage[] }[]>((slots, passage) => {
  const last = slots[slots.length - 1]
  if (last && last.at === passage.at) last.items.push(passage)
  else slots.push({ at: passage.at, items: [passage] })
  return slots
}, [])

export default function GlobeStage({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const passages = useRef<(HTMLDivElement | null)[]>([])
  const overlay = useRef<HTMLDivElement>(null)
  const mode = useSyncExternalStore(subscribeToWidth, readMode, serverMode)
  /*
    Set once when the pin releases and cleared once when the reader comes back
    above it. It stays set for the whole page below the release, so scrolling
    away to the team and back finds the globe still live rather than asleep.
  */
  const [pastRelease, setPastRelease] = useState(false)
  /*
    Reaching the corpus panel by keyboard is a reader arriving at the globe just
    as much as scrolling past the release is, so it hands over too. Without this
    the panel would be focusable behind a globe that was still mid argument, or
    it would have to be unreachable until someone scrolled, which is not a
    keyboard path at all.
  */
  const [entered, setEntered] = useState(false)
  const handedOver = pastRelease || entered
  /** The country whose records are open beside the globe. */
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'unknown' || mode === 'static') return

    const paint = (p: number) => {
      PASSAGES.forEach((passage, i) => {
        const arrived = easeOut(span(p, passage.in[0], passage.in[1]))
        const gone = passage.out ? span(p, passage.out[0], passage.out[1]) : 0
        fade(passages.current[i], arrived * (1 - gone), (1 - arrived) * 12)
      })
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
        the last stage and every passage is present at once. No pin, no scrub.
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

    /*
      The handover fires on the crossing, not on the scroll. onLeave is the pin
      releasing at the bottom of the globe well and onEnterBack is coming back
      up above it; both are called once each way. onRefresh covers arriving with
      the page already scrolled past the release, and a resize that moves it.
    */
    const syncHandover = (self: ScrollTrigger) => setPastRelease(self.progress >= 1)

    const trigger = ScrollTrigger.create({
      trigger: container.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress
        paint(self.progress)
      },
      onLeave: syncHandover,
      onEnterBack: syncHandover,
      onRefresh: syncHandover,
    })

    paint(0)

    return () => {
      trigger.kill()
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  }, [mode])

  /*
    The passages belong to the argument and not to what comes after it. They are
    fixed to the viewport, which is right while the globe is pinned and wrong
    the moment it is not: left up they would ride down the page over the roadmap
    and the team, naming shells that are long gone.
  */
  const shown = useRef<boolean | null>(null)
  useEffect(() => {
    const el = overlay.current
    if (!el || mode !== 'live') return
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    const move = shown.current !== null && shown.current !== handedOver && !calm
    shown.current = handedOver
    gsap.to(el, {
      opacity: handedOver ? 0 : 1,
      duration: move ? HANDOVER_MS / 1000 : 0,
      ease: 'power2.inOut',
      overwrite: true,
    })
  }, [handedOver, mode])

  const capturing = mode === 'still'

  /** Label and gloss for a shell, one line of prose for anything else. */
  const body = (key: string) => {
    if (key.startsWith('shell-')) {
      const shell = copy.shells[Number(key.slice(6))]
      return (
        <>
          <p className="font-mono text-[1rem] tracking-wide text-accent">{shell.label}</p>
          <p className="mt-2 text-[1.25rem] leading-snug text-ink">{shell.gloss}</p>
        </>
      )
    }
    const line =
      key === 'opening'
        ? copy.openingNote
        : key === 'descent'
          ? copy.descentNote
          : copy.nodesNote
    return <p className="text-[1.25rem] leading-snug text-ink">{line}</p>
  }

  return (
    <div ref={container} className="relative">
      {/*
        The globe layer. Sticky, so it holds at the top of the viewport for the
        whole container and comes to rest flush with the globe well at the end.
        Pointer events are off until the handover.
      */}
      <div
        aria-hidden="true"
        data-globe-still={capturing ? '' : undefined}
        className={
          capturing
            ? 'fixed inset-0 z-50 bg-surface'
            : [
                'sticky top-0 h-screen w-full overflow-hidden max-[1199px]:hidden',
                handedOver ? 'pointer-events-auto' : 'pointer-events-none',
              ].join(' ')
        }
      >
        <div className="absolute inset-0">
          {mode === 'live' || capturing ? (
            <GlobeMount
              progress={progress}
              interactive={handedOver}
              selected={selected}
              onSelect={setSelected}
            />
          ) : null}
        </div>
      </div>

      {/*
        The runway and the well, pulled back over the globe. The sticky element
        occupies a 100vh slot in flow, so without this the argument would start
        a screen below where the pin does.
      */}
      <div
        className={`pointer-events-none relative -mt-[100vh] max-[1199px]:mt-0 ${
          capturing ? 'invisible' : ''
        }`}
      >
        {children}
      </div>

      {/*
        The corpus, beside the globe. It rides with the sticky layer, so it
        comes to rest in the well exactly where the globe does, and it is
        ordinary DOM rather than an overlay: real buttons, real links, in
        reading order. Hidden while the argument is still running, because
        there is nothing to choose from yet.
      */}
      {capturing || mode !== 'live' ? null : (
        <div
          aria-hidden={handedOver ? undefined : true}
          /*
            Pinned to the last screen of the container, which is the well the
            globe comes to rest in. Absolute rather than sticky: a sticky panel
            carries on down the page over the roadmap and the team, which is
            what it did.
          */
          className={[
            'pointer-events-none absolute inset-x-0 bottom-0 h-screen max-[1199px]:hidden',
            'flex justify-end',
            handedOver ? '' : 'invisible',
          ].join(' ')}
        >
          <div className="h-full w-[26rem] max-w-[34%]">
            <CorpusPanel
              country={selected}
              onSelect={setSelected}
              onClear={() => setSelected(null)}
              onEnter={() => setEntered(true)}
            />
          </div>
        </div>
      )}

      {/*
        The passages, fixed to the viewport and last in paint order so the well
        frame passes behind them rather than through them.
      */}
      {capturing ? null : (
        <div
          ref={overlay}
          className="pointer-events-none fixed inset-0 z-10 max-[1199px]:hidden"
        >
          {SLOTS.map((slot) => (
            <div key={slot.at} className={`absolute flex flex-col gap-6 ${slot.at}`}>
              {slot.items.map((passage) => (
                <div
                  key={passage.key}
                  ref={(el) => {
                    passages.current[PASSAGES.indexOf(passage)] = el
                  }}
                  data-passage={passage.key}
                  style={{ opacity: 0 }}
                >
                  {body(passage.key)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
