'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GlobeGl, { type GlobeMethods } from 'react-globe.gl'
import {
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three'
import gsap from 'gsap'
import { feature } from 'topojson-client'
import topology from 'world-atlas/countries-110m.json'

import corpus from '@/content/corpus by country.json'
import { ISO_NUMERIC_TO_ALPHA3 } from '@/lib/iso-numeric-to-alpha3'
import {
  FLATTEN_AT,
  NODE_ALTITUDE,
  NODE_COLLAR_ALTITUDE,
  NODE_COLLAR_RADIUS,
  NODE_RADIUS,
  NODE_RISE,
  NODE_STAGGER,
  PHASE,
  QATAR_POSE,
  SHELLS,
  SHELL_ARRIVE,
  SUBJECT_CODE,
  SUBJECT_STROKE_OPACITY,
  WHOLE_POSE,
  easeInOut,
  easeOut,
  lerp,
  nodeRing,
  shortestLngDelta,
  span,
  type Pose,
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
   * Hover and click. Off through the argument phase, on from the handover.
   * The polygons carry no keyboard path either way, which is the open item
   * recorded against the globe well.
   */
  interactive?: boolean
  /**
   * Capture mode, for the script that renders the still served below
   * MIN_LIVE_WIDTH. The sphere is centred rather than offset, because the still
   * is not sharing a viewport with a column of prose.
   */
  still?: boolean
}

const COUNTS = (corpus as { byCountry: Counts }).byCountry
const MAX = Math.max(...Object.values(COUNTS))
const NODE_COUNT = 5

/** How far right of centre the sphere sits, as a fraction of the canvas. */
const OFFSET_FRACTION = 0.26

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

/*
  A real graticule: parallels and meridians, at `step` degrees apart.

  A wireframe sphere would have been one line, but three's wireframe draws every
  triangle edge, diagonals included, so it reads as a geodesic dome rather than
  as a globe being taken apart. Points come from the globe's own getCoords, so
  the cage is on the same axis as the country polygons rather than on one this
  file worked out for itself.
*/
function graticule(g: GlobeMethods, step: number) {
  const points: number[] = []
  const push = (lat: number, lng: number) => {
    const { x, y, z } = g.getCoords(lat, lng, 0)
    points.push(x, y, z)
  }
  // Fine enough that a parallel reads as a circle rather than as a polygon.
  const ARC = 4

  for (let lng = -180; lng < 180; lng += step) {
    for (let lat = -90; lat < 90; lat += ARC) {
      push(lat, lng)
      push(Math.min(lat + ARC, 90), lng)
    }
  }

  for (let lat = -90 + step; lat < 90; lat += step) {
    if (Math.abs(lat) > 89) continue
    for (let lng = -180; lng < 180; lng += ARC) {
      push(lat, lng)
      push(lat, lng + ARC)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
  return geometry
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

export default function Globe({ progress, interactive = false, still = false }: GlobeProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const globe = useRef<GlobeMethods | undefined>(undefined)
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

  // The pose the descent starts from. Captured on the way in rather than
  // assumed, because the globe is still rotating when the descent begins and a
  // fixed start longitude would make the camera jump at the boundary.
  const descentFrom = useRef<Pose | null>(null)
  const lastApplied = useRef(-1)

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

    // Two graticule cages around the sphere, told apart by how closely they are
    // ruled and by how brightly they are drawn. Both start invisible.
    const shells = SHELLS.map((shell) => {
      const geometry = graticule(g, shell.graticuleStep)
      const material = new LineBasicMaterial({
        color: palette.rule,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const mesh = new LineSegments(geometry, material)
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
      const rotating = !calm && p < PHASE.descend[0]
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

      if (p < PHASE.descend[0]) {
        /*
          Back above the descent. The camera has to be put back, not just handed
          to the rotation: auto rotate only turns the sphere, so without this a
          reader who scrolls up from Doha keeps the close altitude for the rest
          of the argument. Only latitude and altitude are restored. Longitude
          belongs to the rotation and must not jump.
        */
        descentFrom.current = null
        const pov = g!.pointOfView()
        if (
          Math.abs(pov.lat - WHOLE_POSE.lat) > 0.01 ||
          Math.abs(pov.altitude - WHOLE_POSE.altitude) > 0.001
        ) {
          g!.pointOfView({ lat: WHOLE_POSE.lat, altitude: WHOLE_POSE.altitude }, 0)
        }
      } else {
        /*
          Latitude and altitude come from the opening pose rather than from the
          live camera, so the descent cannot inherit a bad state, and only the
          longitude is read live so the sphere does not jump mid rotation.
        */
        if (!descentFrom.current) {
          descentFrom.current = {
            lat: WHOLE_POSE.lat,
            lng: g!.pointOfView().lng,
            altitude: WHOLE_POSE.altitude,
          }
        }
        const from = descentFrom.current
        const t = easeInOut(span(p, PHASE.descend[0], PHASE.descend[1]))
        g!.pointOfView(
          {
            lat: lerp(from.lat, QATAR_POSE.lat, t),
            lng: from.lng + shortestLngDelta(from.lng, QATAR_POSE.lng) * t,
            altitude: lerp(from.altitude, QATAR_POSE.altitude, t),
          },
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
      if (hovered && hovered.id === d.id) return palette.existing
      if (d.code === SUBJECT_CODE) {
        return withAlpha(palette.existing, SUBJECT_STROKE_OPACITY)
      }
      return withAlpha(palette.rule, d.count > 0 ? 0.85 : 0.42)
    },
    [palette, hovered],
  )

  const altitude = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
      // Flat, so the outline sits on the surface rather than on a wall.
      if (d.code === SUBJECT_CODE) return 0.004
      if (d.count === 0) return 0.004
      // Close in, the bars stop being a reading of the count and become walls
      // across the map. The fill carries the count on its own from here.
      if (flat) return 0.005
      return 0.008 + 0.07 * d.weight
    },
    [flat],
  )

  const onHover = useCallback(
    (obj: object | null) => {
      if (!interactive) return
      setHovered((obj as CountryDatum) ?? null)
    },
    [interactive],
  )

  const onClick = useCallback(
    (obj: object) => {
      if (!interactive) return
      const d = obj as CountryDatum
      if (d.code) console.log(d.code)
    },
    [interactive],
  )

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPointer({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  // globe.gl's own graticule carries a colour this system does not define, so
  // it is off and the sphere is painted flat from the surface token instead.
  const sphereTexture = useMemo(() => flatTexture(palette.sphere), [palette])

  const ready = size.w > 0 && size.h > 0

  /*
    The prose holds the left margin and the sphere moves off it, rather than the
    scrim being driven up until the text passes. A scrim heavy enough to carry
    ink to 4.5:1 over a lit polygon would take the globe down with it.
  */
  const offset = useMemo<[number, number]>(
    () => (still ? [0, 0] : [Math.round(size.w * OFFSET_FRACTION), 0]),
    [still, size.w],
  )

  return (
    <div
      ref={wrap}
      onMouseMove={interactive ? onMove : undefined}
      onMouseLeave={interactive ? () => setHovered(null) : undefined}
      className="relative h-full w-full overflow-hidden"
    >
      {ready ? (
        <GlobeGl
          ref={globe}
          width={size.w}
          height={size.h}
          globeOffset={offset}
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
          className="pointer-events-none absolute z-10 border border-rule border-l-2 border-l-accent bg-surface px-3 py-2"
          style={{
            left: Math.min(pointer.x + 16, Math.max(0, size.w - 240)),
            top: Math.min(pointer.y + 14, Math.max(0, size.h - 90)),
            maxWidth: '15rem',
          }}
        >
          <p className="text-ink">{hovered.name}</p>
          <p className="font-mono text-[0.8rem] text-accent">
            {hovered.count} {hovered.count === 1 ? 'record' : 'records'}
          </p>
          {hovered.code ? (
            <p className="font-mono text-[0.8rem] tracking-wide text-ink-muted">{hovered.code}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
