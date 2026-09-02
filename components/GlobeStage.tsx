'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import CorpusPanel from './CorpusPanel'
import GlobeMount from './GlobeMount'
import copy from '@/content/globe.json'
import {
  MIN_LIVE_WIDTH,
  NARROW_WIDTH,
  STILL_FRAMES,
  SUBJECT_PRESENCE,
  type StillFrame,
  easeOut,
  span,
  stageAt,
  stageOpacity,
  stageTransform,
} from '@/lib/globe-sequence'

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

  Below NARROW_WIDTH the same scene runs, stacked rather than ranged across the
  frame. The globe holds a band at the top of the viewport, the passages sit
  directly under that band, and the prose runs beneath both. Two things follow
  from the stack that are worth stating, because both were bugs first.

  The layer stays sticky there rather than going fixed. Fixed is what lets the
  globe sit behind the whole page, which is right when it is a background at
  z-0; a band that is opaque and above the sections has to belong to the
  argument container only, or it covers the hero.

  Presence does not apply either. Presence scales and fades the layer according
  to how much of the page the globe should own, which is the wrong question for
  a band that is either present or gone.

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
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
  calm.addEventListener('change', onChange)
  return () => {
    window.removeEventListener('resize', onChange)
    calm.removeEventListener('change', onChange)
  }
}

/*
  Whether this browser can actually run the scene.

  Width and reduced motion are choices. This is not: a device that cannot give
  three.js a context would mount the canvas, fail, and leave an empty band where
  the globe should be, which is worse than the stills it replaced. The static
  path already exists and is the honest answer, so anything without WebGL takes
  it. Chromium and Safari on the desk both pass; the reason this is here is the
  handsets and the locked down browsers that cannot be tested from a desk.

  Cached, because this is read on every getSnapshot and a context is not free.
*/
let webglSupport: boolean | null = null

function hasWebGL() {
  if (webglSupport !== null) return webglSupport
  try {
    const canvas = document.createElement('canvas')
    webglSupport = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    webglSupport = false
  }
  return webglSupport
}

/** Whether the sequence stacks rather than ranging across the frame. */
function readNarrow() {
  return window.innerWidth < NARROW_WIDTH
}

function serverNarrow() {
  return false
}

function readMode(): Mode {
  if (new URLSearchParams(window.location.search).get('globe') === 'still') return 'still'
  /*
    Reduced motion takes the static path, which is the same three frames in
    document order the narrow path gets.

    It used to run the live scene and hold it at the last state with every
    passage present at once. That is a frozen animation rather than an
    alternative to one: the move the argument is built on was not expressed, it
    was skipped to the end of. Three frames are that move without scroll, and
    they are the same three frames, so there is one static path to maintain
    rather than two.
  */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static'
  if (!hasWebGL()) return 'static'
  return window.innerWidth >= MIN_LIVE_WIDTH ? 'live' : 'static'
}

/** Which frame the capture is for. Only ever read in the capture mode. */
function captureFrame(): StillFrame {
  const asked = new URLSearchParams(window.location.search).get('frame')
  const found = STILL_FRAMES.find((f) => f.id === asked)
  return (found ?? STILL_FRAMES[STILL_FRAMES.length - 1]).id
}

function serverMode(): Mode {
  return 'unknown'
}

/** Opacity and a short lift. Both compositor properties, so nothing reflows. */
function fade(el: HTMLElement | null, opacity: number, lift: number) {
  if (!el) return
  /*
    Only passages that are actually on screen are in the document at all. A
    passage held at zero opacity was leaving a card shaped hole in the globe
    behind it: its layer sits over the WebGL canvas and the rectangle underneath
    is not repainted. Zero opacity does not release that layer, nor does
    visibility hidden, nor display none, so the element is unmounted instead.
    On the old dark ground the hole showed the page, which was near black, so
    nobody saw it; it became obvious the moment the page turned white.

    Unmounting is a React render, not a style write, so it happens when a
    passage crosses in or out and not on every frame. Because passages leave
    layout, no two share a stacked box: they are positioned singly.
  */
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
  { key: 'nodes', in: [0.82, 0.88], out: null, at: 'bottom-[9.5rem] right-14 w-[34ch] text-right' },
]

/*
  Passages that share a position share one box and stack inside it, rather than
  each carrying an offset measured against the height of the one below. Copy
  edits change those heights, and a hand tuned offset would put text back over a
  lit polygon silently. `tests/globe contrast.py` would catch it, but not
  needing to be caught is better.
*/
/*
  Passages sit on a card rather than straight on the globe.

  On the dark ground they did not need one: the sphere left dark corners and a
  dark half at the descent, so placing each passage where the sphere was not met
  4.5:1 on its own. On a white ground with a saturated blue map filling the
  frame there is no reliably light region left to move them to, and the measured
  worst case was 3.38:1. Placement still decides where they go; it can no longer
  decide whether they are legible.
*/
const PANEL = 'border-l-2 border-l-accent bg-surface-raised px-4 py-3'

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
  /*
    The globe layer. Always the full viewport, always centred, and always under
    the page content. What presence changes is how solid it is.
  */
  const layer = useRef<HTMLDivElement>(null)
  const runway = useRef<HTMLDivElement>(null)
  const presence = useRef(1)
  const mode = useSyncExternalStore(subscribeToWidth, readMode, serverMode)
  const narrow = useSyncExternalStore(subscribeToWidth, readNarrow, serverNarrow)

  /*
    Publish the path taken, so the CSS pair can defer to it. The media queries
    settle width and reduced motion before any script runs; this settles the one
    question they cannot ask, whether the browser can run the scene at all.
  */
  useEffect(() => {
    if (mode === 'unknown') return
    const root = document.documentElement
    root.dataset.globePath = mode === 'static' ? 'static' : 'live'
    return () => {
      delete root.dataset.globePath
    }
  }, [mode])
  /*
    Set once when the pin releases and cleared once when the reader comes back
    above it. It stays set for the whole page below the release, so scrolling
    away to the team and back finds the globe still live rather than asleep.
  */
  const [pastRelease, setPastRelease] = useState(false)
  /*
    The handover. It used to be `pastRelease || entered`, where `entered` was set
    when the overlay panel took focus and had no path back to false, so one
    keyboard reader touching it froze the camera for the rest of the session.
    The panel is ordinary page content now and does not need to hand anything
    over, so the latch is gone with it.
  */
  const handedOver = pastRelease
  /** The country whose records are open beside the globe. */
  const [selected, setSelected] = useState<string | null>(null)
  /** Which passages are on screen. See the note on fade above. */
  const [live, setLive] = useState<boolean[]>(() => PASSAGES.map(() => false))
  const liveRef = useRef<boolean[]>(PASSAGES.map(() => false))
  /*
    The painter, kept where the effect below can reach it. A passage that has
    just been mounted has never been painted, and paint only runs on a scroll
    update, so without re applying it here a passage that came back would sit at
    the zero opacity it was rendered with until the reader moved again.
  */
  const paintRef = useRef<((p: number) => void) | null>(null)
  /*
    Read inside the presence writer, which runs on the scroll event and not on a
    React render, so it cannot close over the state value.
  */
  const handedOverRef = useRef(false)
  /** Mirrors pastRelease, so the scroll handler can tell a crossing from a hold. */
  const releasedRef = useRef(false)

  useEffect(() => {
    handedOverRef.current = handedOver
    /*
      The handover can happen without a scroll: reaching the corpus panel by
      keyboard sets it, and so does arriving with the page already below the
      release. Pointer input is written on the scroll event, so without writing
      it here as well the globe would stay inert until the reader moved again.
    */
    const stage = layer.current
    if (stage && stage.style.position === 'fixed') {
      stage.style.pointerEvents =
        presence.current >= SUBJECT_PRESENCE && handedOver ? 'auto' : 'none'
    }
  }, [handedOver])

  useEffect(() => {
    if (mode === 'unknown' || mode === 'static') return

    const paint: (p: number) => void = (p) => {
      let changed = false
      const next = PASSAGES.map((passage, i) => {
        const arrived = easeOut(span(p, passage.in[0], passage.in[1]))
        const gone = passage.out ? span(p, passage.out[0], passage.out[1]) : 0
        const o = arrived * (1 - gone)
        fade(passages.current[i], o, (1 - arrived) * 12)
        const on = o > 0.005
        if (on !== liveRef.current[i]) changed = true
        return on
      })
      if (changed) {
        liveRef.current = next
        setLive(next)
      }
    }
    paintRef.current = paint

    /*
      Capture mode holds one frame of the argument and nothing else. Which one
      comes from the address, so `scripts/globe still.py` can walk the three
      without this file knowing anything about how they are used.
    */
    if (mode === 'still') {
      const frame = STILL_FRAMES.find((f) => f.id === captureFrame())!
      progress.current = frame.at
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
      /*
        One viewport short of the container bottom, because the container ends
        with a held screen the sequence does not use. The sequence has to finish
        when the well fills the frame; the hold after it is where the globe is
        handed over, at full strength, with nothing else on screen to fade for.
        See GlobeHold in app/page.tsx.
      */
      end: () => `bottom bottom-=${window.innerHeight}`,
      onUpdate: (self) => {
        progress.current = self.progress
        paint(self.progress)
      },
    })

    paint(0)

    /*
      The globe leaves the argument container and holds the viewport for the
      whole page. It was sticky inside a five screen container, so it existed
      only for those five screens and scrolled away with them; fixed, it is
      there from the hero to the footer and presence decides how much of the
      frame it takes.

      Presence is not a ScrollTrigger. A trigger only reports while it is
      between its own start and end, and this has to keep answering above the
      argument and below it, which is most of the page. It is one rectangle read
      off the container on the scroll event Lenis is already emitting.
    */
    const stage = layer.current
    // Copied out of the ref here so the cleanup restores the node this effect
    // actually touched rather than whatever the ref points at by then.
    const flow = runway.current
    // Stacked, the layer stays sticky and keeps its slot in flow: the prose is
    // meant to begin under the band, not behind it.
    if (stage && !narrow) stage.style.position = 'fixed'
    // The pullback exists to cancel the 100vh slot a sticky layer takes in
    // flow. A fixed layer takes none, so it has to go with it.
    if (flow && !narrow) flow.style.marginTop = '0px'


    const applyPresence = () => {
      const el = container.current
      const stageEl = layer.current
      if (!el || !stageEl) return
      const box = el.getBoundingClientRect()
      const vh = window.innerHeight
      /*
        The handover, from the rectangle rather than from a ScrollTrigger
        callback.

        It used to hang off onLeave, which fires when the trigger's end is
        passed, and moving that end to make room for the hold silently stopped
        it firing at all: the globe was never handed over and never took a
        pointer event. Geometry cannot drift out from under itself like that.
        The sequence is finished once the container has no more than the held
        screen left below the fold, and it stays finished for the rest of the
        page. Scrolling back above it flips this and the camera walks back.
      */
      const finished = box.bottom <= 2 * vh
      if (finished !== releasedRef.current) {
        releasedRef.current = finished
        setPastRelease(finished)
      }

      const { presence: p, strength } = stageAt(box.top, box.bottom, vh)
      presence.current = p

      if (!narrow) {
        stageEl.style.transform = stageTransform(p)
        stageEl.style.opacity = stageOpacity(strength).toFixed(3)
      }
      /*
        Pointer input belongs to the globe only while it is prominent. See
        SUBJECT_PRESENCE.
      */
      stageEl.style.pointerEvents =
        p >= SUBJECT_PRESENCE && handedOverRef.current ? 'auto' : 'none'
    }

    lenis.on('scroll', applyPresence)
    window.addEventListener('resize', applyPresence)
    applyPresence()

    return () => {
      trigger.kill()
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.off('scroll', applyPresence)
      window.removeEventListener('resize', applyPresence)
      lenis.destroy()
      if (stage) {
        stage.style.position = ''
        stage.style.transform = ''
        stage.style.opacity = ''
        stage.style.pointerEvents = ''
      }
      if (flow) flow.style.marginTop = ''
    }
  }, [mode, narrow])


  // Newly mounted passages have never been painted. See paintRef above.
  useEffect(() => {
    paintRef.current?.(progress.current)
  }, [live])

  /*
    The passages belong to the argument and not to what comes after it. Past the
    handover none of them is mounted: the last two carry no exit of their own,
    because they are meant to hold to the end of the sequence, so without this
    they would ride down the page over the roadmap and the team.

    Mounting is the only thing that decides whether a passage is on screen.
    There used to be a second control, an opacity tween on the whole overlay
    keyed on the handover, and the two disagreed depending on which ran last:
    the overlay would be left at full opacity with the passages faded, or the
    reverse. One gate, checked in one place.
  */

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
        ref={layer}
        aria-hidden="true"
        data-globe-still={capturing ? '' : undefined}
        /*
          Sticky in the markup and switched to fixed by the effect that drives
          it. Sticky is what the server renders and what the reduced motion path
          keeps: it holds the globe inside the argument container, which is the
          behaviour that path already had. Fixed is what lets the globe sit
          behind the whole page, and it is only ever reached once the scroll
          driver is running and can set the strength presence asks for.
        */
        data-globe-live={capturing ? undefined : ''}
        className={
          capturing
            ? 'fixed inset-0 z-50 bg-surface'
            : [
                narrow
                  ? // Stacked: an opaque band at the top of the viewport, above
                    // the prose rather than behind it, so the two never share a
                    // pixel. z-30 clears [data-above-globe], which is z-10.
                    'sticky top-0 z-30 h-[58svh] w-full overflow-hidden bg-surface'
                  : // z-0 and every section above it: the globe is behind the
                    // page, not over it. See [data-above-globe] in globals.css.
                    'sticky top-0 z-0 h-screen w-full origin-center overflow-hidden',
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
        ref={runway}
        className={`pointer-events-none relative ${
          narrow ? '' : '-mt-[100vh]'
        } ${
          capturing ? 'invisible' : ''
        }`}
      >
        {children}
      </div>

      {/*
        The corpus index, in the document under the globe.

        Ordinary page content at every width and in every mode, because it is
        the keyboard path to a globe that is navigation. As an overlay it was
        above 1200 only and focusable only once the reader had scrolled to the
        handover, which is not a keyboard path at all.

        The cost is that a click on the map shows its records below the fold
        rather than beside the sphere. The map still answers the click on its
        own: the chosen country keeps the accent outline.
      */}
      <div className="relative z-10 w-full px-6 pb-4 md:px-10 2xl:px-16">
        <CorpusPanel
          country={selected}
          onSelect={setSelected}
          onClear={() => setSelected(null)}
        />
      </div>

      {/*
        The passages, fixed to the viewport and last in paint order so the well
        frame passes behind them rather than through them.
      */}
      {capturing ? null : (
        <div data-globe-live className="pointer-events-none fixed inset-0 z-40">
          {/*
            Stacked, every passage arrives in one place directly under the globe
            band, so there is one slot rather than five. The corners the wide
            composition uses do not exist on a phone, where the sphere fills its
            band edge to edge. Five containers at one position was the first
            attempt and it stacked two cards on the same coordinates through
            every cross fade, so one card's text ran past the other's panel.
          */}
          {(narrow ? [{ at: 'stacked', items: PASSAGES }] : SLOTS).map((slot) => (
            <div
              key={slot.at}
              className={
                narrow
                  ? 'absolute top-[58svh] right-4 left-4 mt-4 flex flex-col gap-4'
                  : `absolute flex flex-col gap-6 ${slot.at}`
              }
            >
              {slot.items.map((passage) =>
                handedOver || !live[PASSAGES.indexOf(passage)] ? null : (
                <div
                  key={passage.key}
                  ref={(el) => {
                    passages.current[PASSAGES.indexOf(passage)] = el
                  }}
                  data-passage={passage.key}
                  style={{ opacity: 0 }}
                  className={PANEL}
                >
                  {body(passage.key)}
                </div>
              )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
