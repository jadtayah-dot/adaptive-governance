'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GlobeGl, { type GlobeMethods } from 'react-globe.gl'
import { feature } from 'topojson-client'
import topology from 'world-atlas/countries-110m.json'

import corpus from '@/content/corpus by country.json'
import { ISO_NUMERIC_TO_ALPHA3 } from '@/lib/iso-numeric-to-alpha3'

/*
  Stage one of the globe. Country polygons from world-atlas, extruded and lit by
  the number of corpus records naming that country. Slow rotation, hover and
  click. No scroll behaviour and no work package nodes yet.

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

const COUNTS = (corpus as { byCountry: Counts }).byCountry
const MAX = Math.max(...Object.values(COUNTS))

/** Reads a token off the document so components never carry a raw value. */
function token(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/*
  A one pixel texture in a flat colour, so the sphere can be painted from a
  token. globe.gl takes an image URL for the globe surface, and three ships no
  type declarations, so colouring it through a material would mean either an
  unapproved @types/three or a blanket module declaration that would strip the
  types react-globe.gl does provide. This costs nothing and keeps both.
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

export default function Globe() {
  const wrap = useRef<HTMLDivElement>(null)
  const globe = useRef<GlobeMethods | undefined>(undefined)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState<CountryDatum | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  // This component never renders on the server, so the tokens are readable on
  // the first render and there is nothing to synchronise in an effect.
  const palette = useMemo(
    () => ({
      existing: token('--ag-globe-existing', '#d9a441'),
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
    const calm =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const controls = g.controls()
    controls.autoRotate = !calm
    controls.autoRotateSpeed = 0.28
    controls.enableZoom = false
    g.pointOfView({ lat: 18, lng: 12, altitude: 2.3 })
  }, [])

  const capColor = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
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
      if (d.count === 0) return withAlpha(palette.rule, 0.16)
      return withAlpha(palette.existing, (palette.floor + (1 - palette.floor) * d.weight) * 0.7)
    },
    [palette],
  )

  const strokeColor = useCallback(
    (obj: object) => {
      const d = obj as CountryDatum
      if (hovered && hovered.id === d.id) return palette.existing
      return withAlpha(palette.rule, d.count > 0 ? 0.85 : 0.42)
    },
    [palette, hovered],
  )

  const altitude = useCallback((obj: object) => {
    const d = obj as CountryDatum
    return d.count === 0 ? 0.004 : 0.008 + 0.07 * d.weight
  }, [])

  const onHover = useCallback((obj: object | null) => {
    setHovered((obj as CountryDatum) ?? null)
  }, [])

  const onClick = useCallback((obj: object) => {
    const d = obj as CountryDatum
    if (d.code) console.log(d.code)
  }, [])

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPointer({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  // globe.gl's own graticule carries a colour this system does not define, so
  // it is off and the sphere is painted flat from the surface token instead.
  const sphereTexture = useMemo(() => flatTexture(palette.sphere), [palette])

  const ready = size.w > 0 && size.h > 0

  return (
    <div
      ref={wrap}
      onMouseMove={onMove}
      onMouseLeave={() => setHovered(null)}
      className="relative h-full w-full overflow-hidden"
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
          polygonsTransitionDuration={0}
          onPolygonHover={onHover}
          onPolygonClick={onClick}
        />
      ) : null}

      {hovered ? (
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
