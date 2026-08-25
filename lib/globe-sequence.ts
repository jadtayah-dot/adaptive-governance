/*
  The globe sequence, as numbers.

  Everything here is pure and framework free, so the choreography can be read,
  checked and changed without opening a component. The four spans come from
  docs/build plan v2.md Part B and are the same boundaries the copy is written
  against. Progress is 0 at the top of the hero and 1 at the bottom of the globe
  well in section five.
*/

export interface Pose {
  lat: number
  lng: number
  altitude: number
}

/** Span boundaries. Keep these in one place: the labels are timed against them. */
export const PHASE = {
  whole: [0.0, 0.2],
  dissect: [0.2, 0.45],
  descend: [0.45, 0.7],
  nodes: [0.7, 1.0],
} as const

/** Opening view. Enough of the sphere in frame that the distribution reads. */
export const WHOLE_POSE: Pose = { lat: 18, lng: 12, altitude: 2.3 }

/**
 * Doha. The descent target.
 *
 * The altitude is 0.9 rather than the 0.35 in the build plan. That figure was
 * written against a globe with no extrusion; at 0.35 over 110m boundary data
 * with raised polygons the side walls become slabs several hundred pixels high
 * and no country is identifiable.
 */
export const QATAR_POSE: Pose = { lat: 25.28, lng: 51.52, altitude: 0.9 }

/**
 * Where the polygon extrusion starts coming down. The bar heights carry the
 * count at world scale and turn into noise close in, so they flatten on the way
 * to Doha and the colour carries the count on its own from there.
 */
export const FLATTEN_AT = 0.52

/**
 * The two shells that separate. The third shell of the argument is the globe
 * itself at radius 1.00, which never moves, so it has no entry here.
 *
 * `from` and `to` are multiples of the globe radius. The two `separate` spans
 * overlap but do not coincide: the outer shell leaves first and the middle one
 * follows, so the diagram comes apart in sequence and each label has something
 * to name when it arrives.
 *
 * The shells are told apart by graticule spacing and by opacity. WebGL caps
 * line width at one pixel on every mainstream implementation, so weight has to
 * be carried by how much line there is rather than by how thick it is: the
 * outer shell is sparse and faint, the middle one closer ruled and brighter.
 *
 * Both start at zero opacity and fade in over the first part of their own
 * travel, so phase one is a bare sphere.
 */
export const SHELLS = [
  {
    id: 'global',
    from: 1.04,
    to: 1.7,
    separate: [0.2, 0.34],
    opacityPeak: 0.3,
    opacityEnd: 0.1,
    graticuleStep: 30,
  },
  {
    id: 'regional',
    from: 1.02,
    to: 1.35,
    separate: [0.29, 0.45],
    opacityPeak: 0.48,
    opacityEnd: 0.2,
    graticuleStep: 15,
  },
] as const

/** How much of a shell's own travel it takes to fade in. */
export const SHELL_ARRIVE = 0.28

/**
 * When each label arrives, as a progress value. Ordered outermost first, and
 * timed just after that shell starts moving. The third names the globe itself,
 * which is what is left once both shells have gone. These index the shells
 * array in content/globe.json, which is in the same order.
 */
export const LABEL_REVEAL = [0.25, 0.34, 0.41] as const

/** Labels clear the frame before the descent starts. */
export const LABEL_CLEAR = [0.47, 0.56] as const

/** The one line about the thin Gulf, held from the descent to the end. */
export const NOTE_REVEAL = [0.57, 0.64] as const

/** The line naming the five nodes, once enough of them are up to be counted. */
export const NODES_NOTE_REVEAL = [0.8, 0.87] as const

/**
 * The country the sequence descends to.
 *
 * It holds zero records, so under the ordinary rules it is drawn as land like
 * any other country the corpus does not reach, and at the bottom of the descent
 * the reader cannot find the subject of the project. It is drawn instead as an
 * accent outline with no fill, so it reads as present and empty rather than as
 * absent. A zero that can be seen is the point of the descent.
 */
export const SUBJECT_CODE = 'QAT'
/** Low enough to stay clear of the fill floor, above 3:1 as a line. */
export const SUBJECT_STROKE_OPACITY = 0.6

/** Doha, and the ring the five work package nodes sit on, in degrees. */
export const DOHA = { lat: 25.2854, lng: 51.531 }
export const NODE_RING_DEGREES = 0.575

/*
  Node geometry, as multiples of the globe radius. The collar is a dark disc
  left on the surface under each lifted node. It separates nodes that overlap
  and, because the node sits above it, it reads as that node's shadow and gives
  the group depth as the sphere turns. Five reads as five.
*/
export const NODE_RADIUS = 0.004
export const NODE_COLLAR_RADIUS = 0.0074
export const NODE_ALTITUDE = 0.012
export const NODE_COLLAR_ALTITUDE = 0.001

/** Each node arrives after the one before it. */
export const NODE_STAGGER = 0.045
export const NODE_RISE = 0.1

export function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Progress of `p` across the span `[a, b]`, clamped to 0 and 1. */
export function span(p: number, a: number, b: number) {
  return b === a ? (p < a ? 0 : 1) : clamp01((p - a) / (b - a))
}

/** Symmetric ease. Used wherever something both starts and stops in frame. */
export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/** Decelerating ease. Used where something arrives and stays. */
export function easeOut(t: number) {
  return 1 - (1 - t) ** 3
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/**
 * The signed shortest way round from one longitude to another. Without this the
 * descent can take the long way and spin most of the way round the sphere to
 * reach Doha, which reads as an error rather than as a movement.
 */
export function shortestLngDelta(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180
}

/**
 * The five work package nodes, as a ring around Doha. The longitude step is
 * divided by the cosine of the latitude so the ring is round on the sphere
 * rather than stretched east to west.
 */
export function nodeRing(count: number): { lat: number; lng: number }[] {
  const cos = Math.cos((DOHA.lat * Math.PI) / 180)
  return Array.from({ length: count }, (_, i) => {
    // Start at the top and go clockwise, so the first node reads as first.
    const angle = (Math.PI / 2) - (i * 2 * Math.PI) / count
    return {
      lat: DOHA.lat + NODE_RING_DEGREES * Math.sin(angle),
      lng: DOHA.lng + (NODE_RING_DEGREES * Math.cos(angle)) / cos,
    }
  })
}
