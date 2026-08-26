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

/**
 * The narrowest viewport that runs the live scene.
 *
 * The pinned sequence needs three things across the viewport at once: a 68
 * character measure, a sphere that never sits under it, and a column for the
 * annotations that never enters the measure. Measured at this type scale, the
 * measure is about 800 pixels and the annotation column about 210, and the
 * three stop fitting below roughly 1200. Under that the site serves the static
 * path instead: a still of the last stage, and the same copy as ordinary text.
 *
 * PRODUCT.md sets the floor at 768. This is well above it, and deliberately:
 * between 768 and 1200 the live scene fits only by putting something on top of
 * something else, and a reviewer on a tablet is better served by a page that
 * simply reads.
 */
export const MIN_LIVE_WIDTH = 1200

/** Span boundaries. Keep these in one place: the labels are timed against them. */
export const PHASE = {
  whole: [0.0, 0.2],
  dissect: [0.2, 0.45],
  descend: [0.45, 0.7],
  nodes: [0.7, 1.0],
} as const

/*
  Altitude is what decides how big the sphere is on screen, because globe.gl
  frames by field of view: the camera sits at radius times one plus altitude and
  a wider canvas buys empty pixels rather than reach. At altitude 2.3 the sphere
  covered about two thirds of the viewport height and a third of its width on a
  wide screen, which reads as a marble in a room rather than as the subject.

  The sphere runs off every edge of the viewport. It is not a sphere with
  margins around it: no limb is in frame, and what the reader sees is a surface
  they are close to.

  That cannot be a constant, because globe.gl frames by field of view and a
  wider canvas buys empty pixels rather than reach. A fixed altitude that fills
  a 1440 frame leaves margins on a 1920 one. So the opening altitude is computed
  from the canvas each time it changes, and the camera never backs off it.

    screen diameter = canvasHeight / (distance * tan(fov / 2))

  with distance in globe radii. Setting the screen diameter to VIEW_OVERFLOW
  times the canvas width and solving for distance gives the altitude below.
*/
export const VIEW_OVERFLOW = 1.06
/** Far enough out that the camera never ends up inside the sphere. */
export const MIN_ALTITUDE = 0.08

export function fillingAltitude(canvasW: number, canvasH: number, fovDegrees: number): number {
  if (canvasW <= 0 || canvasH <= 0) return MIN_ALTITUDE
  const distance = canvasH / (VIEW_OVERFLOW * canvasW * Math.tan((fovDegrees * Math.PI) / 360))
  return Math.max(MIN_ALTITUDE, distance - 1)
}

/** The descent goes in from the opening altitude by this much. */
export const DESCENT_RATIO = 0.42

/** Where the sequence opens. Longitude is only a starting point: it rotates. */
export const OPENING_LAT = 18
export const OPENING_LNG = 12

/**
 * Doha. The descent target. Altitude is derived from the opening altitude
 * rather than fixed, so the descent is always the same move in from whatever
 * filling the frame turned out to require.
 */
export const QATAR: { lat: number; lng: number } = { lat: 25.28, lng: 51.52 }

/**
 * Altitude for any point in the sequence. Held close for the whole globe and
 * the dissection, then down to Doha.
 *
 * A pure function of the scroll position, which is what lets the camera find
 * its own way back when a reader scrolls up: there is no state to restore.
 */
export function altitudeAt(p: number, opening: number): number {
  return lerp(
    opening,
    opening * DESCENT_RATIO,
    easeInOut(span(p, PHASE.descend[0], PHASE.descend[1])),
  )
}

/** Latitude for any point in the sequence. Holds, then tilts north to Doha. */
export function latitudeAt(p: number): number {
  return lerp(OPENING_LAT, QATAR.lat, easeInOut(span(p, PHASE.descend[0], PHASE.descend[1])))
}

/**
 * Where the polygon extrusion starts coming down. The bar heights carry the
 * count at world scale and turn into noise close in, so they flatten on the way
 * to Doha and the colour carries the count on its own from there.
 */
export const FLATTEN_AT = 0.52

/**
 * The handover. The pin releases at the bottom of the globe well and the camera
 * pulls back out to a whole globe, over this long, once, on the crossing.
 *
 * The longitude is Doha's rather than the opening view's. The reader has just
 * been shown an empty region; pulling straight back from it, with it still in
 * the middle, keeps the place they were looking at and reads as one movement.
 * Going back to the opening longitude would spin the sphere half a turn and
 * throw that away. The far side of the world costs nothing here because the
 * globe is draggable from this point on.
 *
 * Latitude is a little above the equator so the populated half of the map is
 * not squashed against the bottom of the sphere.
 */
export const HANDOVER_MS = 800
export const HANDOVER_LAT = 20

/**
 * The two shells that separate. The third shell of the argument is the globe
 * itself at radius 1.00, which never moves, so it has no entry here.
 *
 * They are translucent surfaces, not wireframes. A wireframe shell can only
 * ever be hairlines, because WebGL caps line width at one pixel on every
 * mainstream implementation, so no amount of opacity makes a cage read as a
 * layer. A faintly filled sphere reads as a layer, and its silhouette against
 * the ground is the edge.
 *
 * `from` and `to` are multiples of the globe radius, and they are small. At an
 * altitude that puts the sphere past every edge of the frame no limb is
 * visible, so no shell silhouette is either, however far it travels. What does
 * read at that range is the shell's own graticule sliding across the surface
 * beneath it, and the parallax between them grows with even a few percent of
 * separation. So each shell is a faint fill for the layer and a graticule for
 * the movement, and they travel to 1.06 and 1.12 rather than out of frame.
 *
 * The two spans overlap but do not coincide, so the outer one leaves first and
 * each label has something to name when it arrives.
 *
 * Both start at zero opacity and fade in over the first part of their own
 * travel, so phase one is a bare sphere. Both thin as they go, so what is left
 * across the frame at the end of the dissection is close to nothing.
 */
export const SHELLS = [
  {
    id: 'global',
    from: 1.04,
    to: 1.12,
    separate: [0.2, 0.34],
    opacityPeak: 0.1,
    opacityEnd: 0.03,
    graticuleStep: 20,
  },
  {
    id: 'regional',
    from: 1.02,
    to: 1.06,
    separate: [0.29, 0.45],
    opacityPeak: 0.14,
    opacityEnd: 0.045,
    graticuleStep: 10,
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
