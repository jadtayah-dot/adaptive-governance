'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GlobeGl, { type GlobeMethods } from 'react-globe.gl'
import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three'
import gsap from 'gsap'
import { feature } from 'topojson-client'
import topology from 'world-atlas/countries-110m.json'

import { useRouter } from 'next/navigation'

import corpus from '@/content/corpus by country.json'
import copy from '@/content/globe.json'
import { ISO_NUMERIC_TO_ALPHA3 } from '@/lib/iso-numeric-to-alpha3'
import {
  FLATTEN_AT,
  HANDOVER_MS,
  HANDOVER_POSE,
  NODE_ALTITUDE,
  NODE_COLLAR_ALTITUDE,
  NODE_COLLAR_RADIUS,
  NODE_RADIUS,
  NODE_RISE,
  NODE_STAGGER,
  PHASE,
  QATAR_POSE,
  altitudeAt,
  SHELLS,
  SHELL_ARRIVE,
  SUBJECT_CODE,
  SUBJECT_STROKE_OPACITY,
  WHOLE_POSE,
  easeInOut,
  easeOut,
  latitudeAt,
  lerp,
  nodeRing,
  shortestLngDelta,
  span,
} from '@/lib/globe-sequence'

/*
  One globe instance for the whole argument. Country polygons from world-atlas,
  extruded and lit by the number of corpus records naming that country, plus the
  two shells that separate during the dissection and the five work package
  nodes that arrive at the end.

  The scroll position arrives as a mutable ref rather than as a prop, and every
  frame is applied by mutating three objects directly. Nothing here goes through
  React state, because a re render per scroll frame would rebuild 177 polygons.

  Every colour is read from the token custom properties at run time rather than
  written here, so DESIGN.md stays the single source. The fill floor in
  particular is a hard rule: below it the accent drops under 3:1 on this surface
  and countries holding one or two records stop being perceivable.
*/

type Counts = Record<string, number>

interface CountryDatum {
  id: string
  code: string | null
  name: string
  count: number
  /** Fill weight, 0 to 1, on a log scale across the corpus range. */
  weight: number
  geometry: unknown
}

export interface GlobeProps {
  /**
   * Scroll position through the pinned argument, 0 to 1. A ref rather than a
   * value so the driver can write to it every frame without re rendering.
   */
  progress: React.RefObject<number>
  /**
   * Hover and click. Off through the argument phase, on from the handover and
   * from then on, whether or not the globe is in view. The polygons carry no
   * keyboard path either way, which is the open item recorded against the globe
   * well: the same counts are readable and filterable in the corpus table.
   */
  interactive?: boolean
}

const COUNTS = (corpus as { byCountry: Counts }).byCountry
const MAX = Math.max(...Object.values(COUNTS))
const NODE_COUNT = 5

/** Reads a token off the document so components never carry a raw value. */
function token(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/*
  A one pixel texture in a flat colour, so the sphere can be painted from a
  token. globe.gl takes an image URL for the globe surface.
*/
function flatTexture(color: string) {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  return c.toDataURL('image/png')
}

/** #rrggbb plus an alpha, as rgba, which is what globe.gl wants for a fill. */
function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildCountries(): { data: CountryDatum[]; unmatched: string[] } {
  const world = topology as unknown as Parameters<typeof feature>[0]
  const collection = feature(world, world.objects.countries) as {
    features: { id?: string | number; properties: Record<string, unknown>; geometry: unknown }[]
  }

  const seen = new Set<string>()
  const data = collection.features.map((f) => {
    // world-atlas ids are ISO 3166-1 numeric, and are absent for the few
    // territories with no ISO code at all.
    const id = f.id === undefined || f.id === null ? '' : String(Number(f.id))
    const code = ISO_NUMERIC_TO_ALPHA3[id] ?? null
    if (code) seen.add(code)
    const count = code ? (COUNTS[code] ?? 0) : 0
    return {
      id,
      code,
      name: String(f.properties.name ?? ''),
      count,
      weight: count > 0 ? Math.log1p(count) / Math.log1p(MAX) : 0,
      geometry: f.geometry,
    }
  })

  return { data, unmatched: Object.keys(COUNTS).filter((c) => !seen.has(c)) }
}

export default function Globe({ progress, interactive = false }: GlobeProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const globe = useRef<GlobeMethods | undefined>(undefined)
  const router = useRouter()
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [live, setLive] = useState(false)
  const [hovered, setHovered] = useState<CountryDatum | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  /*
    Extrusion is the one part of the sequence that is not driven per frame.
    Changing the altitude accessor makes globe.gl rebuild the geometry for all
    177 polygons, which cannot happen at 60fps, so this flips once on the way
    down and once on the way back and globe.gl's own polygon transition covers
    the change.
  */
  const [flat, setFlat] = useState(false)
  const flatRef = useRef(false)

  const calm = useMemo(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // The longitude the descent starts from. Captured on the way in rather than
  // assumed, because the globe is still rotating when the descent begins and a
  // fixed start longitude would make the camera jump at the boundary.
  const descentFrom = useRef<number | null>(null)
  const lastApplied = useRef(-1)
  /*
    Past the handover the camera belongs to the reader, not to the scroll
    position. The ticker reads this rather than the prop so that flipping it
    does not tear down and rebuild the scene.
  */
  const handedOver = useRef(false)

  // This component never renders on the server, so the tokens are readable on
  // the first render and there is nothing to synchronise in an effect.
  const palette = useMemo(
    () => ({
      existing: token('--ag-globe-existing', '#d9a441'),
      project: token('--ag-globe-project', '#7fd0c8'),
      rule: token('--ag-rule', '#726b60'),
      sphere: token('--ag-surface', '#12100e'),
      floor: Number(token('--ag-globe-fill-floor', '0.55')) || 0.55,
    }),
    [],
  )

  const { data, unmatched } = useMemo(() => buildCountries(), [])

  const ready = size.w > 0 && size.h > 0

  // A country in the corpus with no polygon would otherwise vanish silently.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && unmatched.length) {
      console.warn(
        `Globe: ${unmatched.length} corpus country code(s) have no polygon in world-atlas 110m ` +
          `and are not drawn: ${unmatched.join(', ')}`,
      )
    }
  }, [unmatched])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onReady = useCallback(() => {
    const g = globe.current
    if (!g) return
    const controls = g.controls()
    controls.enableZoom = false
    // The camera is scroll driven through the argument, so nothing the pointer
    // does may move it. The handover is what turns these back on.
    controls.enabled = false
    controls.autoRotateSpeed = 0.28
    g.pointOfView(WHOLE_POSE)
    setLive(true)
  }, [])

  /*
    The shells, the nodes and the camera, built once the globe instance exists
    and driven from the progress ref on the gsap ticker. gsap already runs a
    ticker for the scroll driver, so this adds a callback to that one rather
    than opening a second animation loop.
  */
  useEffect(() => {
    const g = globe.current
    if (!live || !g) return

    const scene = g.scene()
    const radius = g.getGlobeRadius()

    /*
      Two translucent surfaces around the sphere. Single sided and with no depth
      write: the camera only ever sees the near hemisphere, which covers the
      whole disc, so one pass is one layer of alpha and the shell tints evenly
      rather than doubling up where the two hemispheres overlap. The edge is the
      silhouette of that disc against the ground.
    */
    const shells = SHELLS.map((shell) => {
      const geometry = new SphereGeometry(radius, 48, 32)
      const material = new MeshBasicMaterial({
        color: palette.rule,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const mesh = new Mesh(geometry, material)
      mesh.scale.setScalar(shell.from)
      mesh.visible = false
      scene.add(mesh)
      return { mesh, material, geometry, shell }
    })

    /*
      The five work packages, as a ring around Doha. Second colour, and a point
      rather than a polygon, so the two kinds of evidence are separated by shape
      as well as by colour.

      Each node is two meshes: the node itself, lifted clear of the surface, and
      a dark collar left on the ground under it. The collar keeps neighbours
      apart where they overlap and reads as the node's shadow, so the group has
      depth and five reads as five rather than as one shape.
    */
    const nodeGeometry = new SphereGeometry(radius * NODE_RADIUS, 16, 12)
    const collarGeometry = new SphereGeometry(radius * NODE_COLLAR_RADIUS, 16, 12)
    const nodes = nodeRing(NODE_COUNT).flatMap((at) => {
      const build = (
        geometry: SphereGeometry,
        color: string,
        opacity: number,
        alt: number,
      ) => {
        const material = new MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
        })
        const mesh = new Mesh(geometry, material)
        const { x, y, z } = g.getCoords(at.lat, at.lng, alt)
        mesh.position.set(x, y, z)
        mesh.scale.setScalar(0)
        mesh.visible = false
        scene.add(mesh)
        return { mesh, material }
      }
      return [
        build(collarGeometry, palette.sphere, 0.92, NODE_COLLAR_ALTITUDE),
        build(nodeGeometry, palette.project, 1, NODE_ALTITUDE),
      ]
    })

    const controls = g.controls()

    function apply(p: number) {
      // Whole, then dissection. The sphere keeps turning through both, so the
      // shells separate off a moving globe rather than off a still one.
      const rotating = !calm && !handedOver.current && p < PHASE.descend[0]
      controls.autoRotate = rotating

      const shouldFlatten = p >= FLATTEN_AT
      if (flatRef.current !== shouldFlatten) {
        flatRef.current = shouldFlatten
        setFlat(shouldFlatten)
      }

      // The shells are gone by the time the camera has finished descending.
      const gone = span(p, PHASE.descend[0], PHASE.descend[0] + 0.17)
      for (const { mesh, material, shell } of shells) {
        // Each shell runs on its own span, so they leave one after the other.
        const travelled = span(p, shell.separate[0], shell.separate[1])
        mesh.scale.setScalar(lerp(shell.from, shell.to, easeInOut(travelled)))
        // Fades in over the start of its own travel, so nothing is on screen
        // during phase one, then thins as it goes out.
        const arrived = easeOut(span(travelled, 0, SHELL_ARRIVE))
        const o =
          arrived * lerp(shell.opacityPeak, shell.opacityEnd, travelled) * (1 - gone)
        material.opacity = o
        mesh.visible = o > 0.002
      }

      // Past the handover the reader owns the camera. Nothing below this line
      // may touch it, or the return would be fought frame by frame and a drag
      // would spring back.
      if (handedOver.current) return

      /*
        Latitude and altitude are pure functions of the scroll position, so the
        camera finds its own way back when a reader scrolls up and there is no
        state to restore. Longitude is the exception: it belongs to the rotation
        until the descent starts, so it is read live at that boundary and
        interpolated from there, or the sphere would jump mid turn.
      */
      const pose = { lat: latitudeAt(p), altitude: altitudeAt(p) }

      if (p < PHASE.descend[0]) {
        descentFrom.current = null
        // No longitude: the rotation owns it, and pointOfView leaves out what
        // it is not given.
        g!.pointOfView(pose, 0)
      } else {
        if (descentFrom.current === null) descentFrom.current = g!.pointOfView().lng
        const from = descentFrom.current
        const t = easeInOut(span(p, PHASE.descend[0], PHASE.descend[1]))
        g!.pointOfView(
          { ...pose, lng: from + shortestLngDelta(from, QATAR_POSE.lng) * t },
          0,
        )
      }

      nodes.forEach(({ mesh }, i) => {
        // Two meshes to a node, so the stagger counts pairs, not meshes.
        const at = PHASE.nodes[0] + Math.floor(i / 2) * NODE_STAGGER
        const s = easeOut(span(p, at, at + NODE_RISE))
        mesh.scale.setScalar(s)
        mesh.visible = s > 0.01
      })
    }

    function tick() {
      const p = progress.current
      // Nothing to do on a still frame unless the globe is turning under its
      // own rotation, which moves the camera without moving the scroll.
      if (p === lastApplied.current && !controls.autoRotate) return
      lastApplied.current = p
      apply(p)
    }

    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      for (const { mesh, material, geometry } of shells) {
        scene.remove(mesh)
        material.dispose()
        geometry.dispose()
      }
      for (const { mesh, material } of nodes) {
        scene.remove(mesh)
        material.dispose()
      }
      nodeGeometry.dispose()
      collarGeometry.dispose()
      lastApplied.current = -1
    }
  }, [calm, live, palette, progress])

  /*
    The handover, and the way back out of it.

    This runs once on each crossing, because it is keyed on the prop and the
    prop only changes when ScrollTrigger reports leaving or re entering the
    pinned range. Everything scroll driven is in the ticker above and none of it
    touches the camera while this owns it.
  */
  useEffect(() => {
    const g = globe.current
    if (!live || !g) return

    handedOver.current = interactive
    const controls = g.controls()
    // Rotate by dragging, but no zoom: the altitude is part of the argument and
    // a reader who zooms into a flat polygon has left the map behind.
    controls.enabled = interactive
    controls.autoRotate = false

    if (interactive) {
      // The bars come back with the camera. That is derived at render from the
      // prop rather than set here, so nothing has to write state from an
      // effect: see `flattened` below.
      g.pointOfView(HANDOVER_POSE, calm ? 0 : HANDOVER_MS)
      return
    }

    /*
      Back above the release point. The camera has to be walked back rather than
      snapped: it took HANDOVER_MS to pull out and an instant cut back in reads
      as a fault. The descent holds one pose for everything from 0.70 up, so the
      ticker can take over again from the end of that tween without a step.
    */
    if (lastApplied.current < 0) return // first run, nothing to return from
    descentFrom.current = QATAR_POSE.lng
    g.pointOfView(QATAR_POSE, calm ? 0 : HANDOVER_MS)
  }, [interactive, live, calm])

  const capColor = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
      // The subject country carries the outline and no fill. See SUBJECT_CODE.
      if (d.code === SUBJECT_CODE) return withAlpha(palette.existing, 0)
      // A country the corpus does not reach is still land, and has to read as
      // land. The section copy calls the thin regions a finding, and a thin
      // region that is invisible cannot be read at all. Rule colour, well under
      // the fill floor, so it can never be mistaken for evidence.
      if (d.count === 0) return withAlpha(palette.rule, 0.26)
      // Never from zero. See the fill floor note in DESIGN.md.
      return withAlpha(palette.existing, palette.floor + (1 - palette.floor) * d.weight)
    },
    [palette],
  )

  const sideColor = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
      if (d.code === SUBJECT_CODE) return withAlpha(palette.existing, 0)
      if (d.count === 0) return withAlpha(palette.rule, 0.16)
      return withAlpha(palette.existing, (palette.floor + (1 - palette.floor) * d.weight) * 0.7)
    },
    [palette],
  )

  const strokeColor = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
      /*
        The subject country keeps its own outline whatever the pointer is doing.
        It holds zero records, so it is not clickable, and brightening it under
        the pointer would offer a filter that does not exist.
      */
      if (d.code === SUBJECT_CODE) {
        return withAlpha(palette.existing, SUBJECT_STROKE_OPACITY)
      }
      // Only countries a click will actually filter light up under the pointer.
      if (hovered && hovered.id === d.id && d.count > 0) return palette.existing
      return withAlpha(palette.rule, d.count > 0 ? 0.85 : 0.42)
    },
    [palette, hovered],
  )

  /*
    The bars are down through the descent and back up at the handover, when the
    camera returns to world scale and they are a reading of the count again.
    Derived rather than stored, so the handover does not have to write state.
  */
  const flattened = flat && !interactive

  const altitude = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
      // Flat, so the outline sits on the surface rather than on a wall.
      if (d.code === SUBJECT_CODE) return 0.004
      if (d.count === 0) return 0.004
      // Close in, the bars stop being a reading of the count and become walls
      // across the map. The fill carries the count on its own from here.
      if (flattened) return 0.005
      return 0.008 + 0.07 * d.weight
    },
    [flattened],
  )

  const onHover = useCallback(
    (obj: object | null) => {
      if (!interactive) return
      setHovered((obj as CountryDatum) ?? null)
    },
    [interactive],
  )

  /*
    A country the corpus does not reach has nothing to filter to, so it is not a
    target. Clicking one has to do nothing rather than send the reader to an
    empty table, and nothing above promises otherwise: no highlight under the
    pointer, no pointer cursor, and the tooltip says the corpus holds none.
  */
  const clickable = useCallback(
    (d: CountryDatum) => interactive && d.count > 0 && Boolean(d.code),
    [interactive],
  )

  const onClick = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
      if (!clickable(d)) return
      // The corpus reads its filters off the query string. See app/corpus.
      router.push(`/corpus?country=${encodeURIComponent(d.code as string)}`)
    },
    [clickable, router],
  )

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPointer({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  // globe.gl's own graticule carries a colour this system does not define, so
  // it is off and the sphere is painted flat from the surface token instead.
  const sphereTexture = useMemo(() => flatTexture(palette.sphere), [palette])

  return (
    <div
      ref={wrap}
      onMouseMove={interactive ? onMove : undefined}
      onMouseLeave={interactive ? () => setHovered(null) : undefined}
      className="relative h-full w-full overflow-hidden"
      style={{ cursor: hovered && clickable(hovered) ? 'pointer' : 'default' }}
    >
      {ready ? (
        <GlobeGl
          ref={globe}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={sphereTexture}
          showGraticules={false}
          showAtmosphere={false}
          onGlobeReady={onReady}
          polygonsData={data}
          polygonGeoJsonGeometry={(d: object) => (d as CountryDatum).geometry as never}
          polygonAltitude={altitude}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonCapCurvatureResolution={2}
          // globe.gl defaults this to the name field and renders its own
          // tooltip. Suppressed, so the only tooltip is the token styled one
          // below and the globe block stays free of text when nothing is hovered.
          polygonLabel={() => ''}
          // Covers the one step change in extrusion on the way to Doha. Nothing
          // else changes the polygon geometry, so this never fires otherwise.
          polygonsTransitionDuration={calm ? 0 : 900}
          onPolygonHover={onHover}
          onPolygonClick={onClick}
        />
      ) : null}

      {interactive && hovered ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute z-10 border border-rule border-l-2 bg-surface px-3 py-2 ${
            // The accent edge marks a country a click will filter to. A country
            // the corpus does not reach gets the plain rule, so the tooltip
            // itself does not read as a control.
            clickable(hovered) ? 'border-l-accent' : 'border-l-rule'
          }`}
          style={{
            left: Math.min(pointer.x + 16, Math.max(0, size.w - 240)),
            top: Math.min(pointer.y + 14, Math.max(0, size.h - 108)),
            maxWidth: '15rem',
          }}
        >
          <p className="text-ink">{hovered.name}</p>
          {hovered.count > 0 ? (
            <p className="font-mono text-[0.8rem] text-accent">
              {hovered.count} {hovered.count === 1 ? copy.tooltip.study : copy.tooltip.studies}
            </p>
          ) : (
            <p className="font-mono text-[0.8rem] text-ink-muted">{copy.tooltip.empty}</p>
          )}
          {clickable(hovered) ? (
            <p className="mt-1 text-[0.8rem] text-ink-muted">{copy.tooltip.filterHint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
