'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import CorpusPanel from './CorpusPanel'
import GlobeMount from './GlobeMount'
import copy from '@/content/globe.json'
import {
  DOCK_MARGIN,
  DOCK_PADDING,
  DOCK_SCALE,
  MIN_LIVE_WIDTH,
  SUBJECT_PRESENCE,
  dockCardOpacity,
  dockTransform,
  easeOut,
  presenceAt,
  span,
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
    The globe layer and the card it comes to rest on when it is not the subject.
    The layer is the full viewport and carries the scale; the card is a plain
    fixed box of the docked size, so its border stays one pixel rather than
    being scaled down to nothing with everything else.
  */
  const layer = useRef<HTMLDivElement>(null)
  const dock = useRef<HTMLDivElement>(null)
  const runway = useRef<HTMLDivElement>(null)
  const presence = useRef(1)
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
    if (stage) stage.style.position = 'fixed'
    // The pullback exists to cancel the 100vh slot a sticky layer takes in
    // flow. A fixed layer takes none, so it has to go with it.
    if (flow) flow.style.marginTop = '0px'

    /*
      The docked card is a plain fixed box rather than a scaled one, so its rule
      stays a rule instead of being scaled down to nothing with everything else.
      Its size is the viewport at the dock scale, which changes only on a
      resize, so it is never written per frame.
    */
    const sizeDock = () => {
      const el = dock.current
      if (!el) return
      const inset = DOCK_MARGIN - DOCK_PADDING
      el.style.width = `${Math.round(window.innerWidth * DOCK_SCALE) + DOCK_PADDING * 2}px`
      el.style.height = `${Math.round(window.innerHeight * DOCK_SCALE) + DOCK_PADDING * 2}px`
      el.style.right = `${inset}px`
      el.style.bottom = `${inset}px`
    }

    const applyPresence = () => {
      const el = container.current
      const stageEl = layer.current
      if (!el || !stageEl) return
      const box = el.getBoundingClientRect()
      const p = presenceAt(box.top, box.bottom, window.innerHeight)
      presence.current = p
      stageEl.style.transform = dockTransform(p)
      // The card belongs to the resting state, so it arrives late rather than
      // sitting under a globe four times its size for the whole travel.
      if (dock.current) dock.current.style.opacity = dockCardOpacity(p).toFixed(3)
      /*
        Pointer input belongs to the globe only while it is the subject. See
        SUBJECT_PRESENCE: a docked sphere is a sixth of the size hover and click
        were built for.
      */
      stageEl.style.pointerEvents =
        p >= SUBJECT_PRESENCE && handedOverRef.current ? 'auto' : 'none'
    }

    lenis.on('scroll', applyPresence)
    const onResize = () => {
      sizeDock()
      applyPresence()
    }
    window.addEventListener('resize', onResize)
    sizeDock()
    applyPresence()

    return () => {
      trigger.kill()
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.off('scroll', applyPresence)
      window.removeEventListener('resize', onResize)
      lenis.destroy()
      if (stage) {
        stage.style.position = ''
        stage.style.transform = ''
        stage.style.pointerEvents = ''
      }
      if (flow) flow.style.marginTop = ''
    }
  }, [mode])


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
      {/*
        The card the globe comes to rest on once it is no longer the subject.

        It is a plain fixed box at the docked size rather than part of the scaled
        layer, so its rule stays one pixel instead of being scaled to a fifth of
        one. It is opaque, which is the point: the docked globe passes over the
        roadmap and the team, and a sphere floating straight over a grid is
        harder to read than a framed object sitting on top of one. Nothing is
        ever laid over it, so it costs nothing in contrast.

        Its opacity is the only thing about it that moves, and it is written on
        the scroll event beside the layer transform.
      */}
      {capturing || mode !== 'live' ? null : (
        <div
          ref={dock}
          data-globe-dock=""
          aria-hidden="true"
          style={{ opacity: 0 }}
          className="pointer-events-none fixed z-20 border border-rule bg-surface max-[1199px]:hidden"
        />
      )}

      <div
        ref={layer}
        aria-hidden="true"
        data-globe-still={capturing ? '' : undefined}
        /*
          Sticky in the markup and switched to fixed by the effect that drives
          it. Sticky is what the server renders and what the reduced motion path
          keeps: it holds the globe inside the argument container, which is the
          behaviour that path already had. Fixed is what lets the globe hold the
          viewport for the whole page, and it is only ever reached once the
          scroll driver is running and can put it where presence says.
        */
        className={
          capturing
            ? 'fixed inset-0 z-50 bg-surface'
            : [
                'sticky top-0 z-30 h-screen w-full origin-bottom-right overflow-hidden',
                'max-[1199px]:hidden',
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
          data-globe-companion=""
          aria-hidden={handedOver ? undefined : true}
          /*
            Pinned to the last screen of the container, which is the well the
            globe comes to rest in. Absolute rather than sticky: a sticky panel
            carries on down the page over the roadmap and the team, which is
            what it did.
          */
          className={[
            'pointer-events-none absolute inset-x-0 bottom-0 z-40 h-screen max-[1199px]:hidden',
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
        <div className="pointer-events-none fixed inset-0 z-40 max-[1199px]:hidden">
          {SLOTS.map((slot) => (
            <div key={slot.at} className={`absolute flex flex-col gap-6 ${slot.at}`}>
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
