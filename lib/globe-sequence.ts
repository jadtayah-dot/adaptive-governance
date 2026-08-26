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
  frames by field of view: the camera sits at radius times one plus altitude.

  The sphere is framed against the viewport height, so its limb is inside the
  frame and it reads as a sphere. It has curvature, a horizon and dark ground at
  the corners, and it still takes most of the height. An earlier version framed
  it against the width instead, which put every edge off screen: at that
  distance the centre of the view is magnified about seven times and what the
  reader saw was one country, not a globe.

    screen diameter = canvasHeight / (distance * tan(fov / 2))

  with distance in globe radii. Setting the screen diameter to VIEW_FILL times
  the canvas height and solving for distance drops the canvas out of it
  entirely, so one altitude frames the sphere the same way at every size.
*/
export const VIEW_FILL = 0.88

export function framingAltitude(fovDegrees: number): number {
  const distance = 1 / (VIEW_FILL * Math.tan((fovDegrees * Math.PI) / 360))
  return Math.max(MIN_ALTITUDE, distance - 1)
}

/*
  The dock.

  The globe is present for the whole page rather than only inside section five.
  It is the subject where the copy is about it and a small object in the corner
  everywhere else, and it travels between the two on scroll.

  The size change is a CSS scale on the whole layer rather than a change of
  altitude or of canvas size. Altitude would work but puts the camera about
  three and a half times further out, where the polygon extrusion stops being
  readable, and resizing the canvas reallocates the drawing buffer on every
  frame of the travel. A scale is one compositor property and the scene never
  learns about it.

  Scaling down is safe in a way scaling up would not be: the canvas is always
  drawn at viewport size, so the docked globe is a downsample rather than a
  magnification.
*/

/**
 * How much of the viewport height the sphere fills once docked.
 *
 * Every section reserves room for the docked globe in its right margin, as
 * --ag-dock-gutter in globals.css, so the two are one number and changing this
 * one means changing that one. It was 0.18 and came down to this because the
 * gutter 0.18 needed took a fifth of the content width at 1200, where the grids
 * are already at their narrowest.
 */
export const DOCK_FILL = 0.14
/** Gap between the docked globe and the corner, in pixels. */
export const DOCK_MARGIN = 24
/*
  Breathing room between the sphere and the card it sits on.

  The layer is the viewport, and the sphere takes VIEW_FILL of its height, so
  scaling the layer down leaves the sphere six percent of the card height clear
  at top and bottom. The polygons are extruded and stand above the surface, so
  at that margin the tallest of them are clipped by the card edge. The card is
  drawn this much larger than the scaled layer on every side instead, which
  leaves the extrusion room without touching the framing the scene computes.
*/
export const DOCK_PADDING = 12
/** The layer is the viewport, so this scales the sphere with everything else. */
export const DOCK_SCALE = DOCK_FILL / VIEW_FILL

/**
 * Presence at or above which the globe is the subject and takes pointer input.
 *
 * Docked it does not, and that is a decision rather than an oversight. Hover
 * and click were built for a sphere filling the frame: at a sixth of that, a
 * country is a few pixels and the tooltip, which lives inside the scaled layer,
 * would be scaled with it. A docked globe that cannot be clicked is honest
 * about what it is, and scrolling back to the well gives the reader the
 * instrument again.
 */
export const SUBJECT_PRESENCE = 0.995

/**
 * How much of the frame the globe takes, from where the argument sits in the
 * viewport. 0 is docked in the corner, 1 is the subject filling the frame.
 *
 * It rises across the viewport height before the argument starts and falls
 * across the viewport height after the well has been passed, so the globe
 * arrives at full size exactly as the sequence begins and leaves only once its
 * resting place has gone by. A pure function of two numbers off one rectangle,
 * which is what lets the reader scroll up and find it where they left it.
 */
export function presenceAt(top: number, bottom: number, viewportHeight: number): number {
  const approach = clamp01((viewportHeight - top) / viewportHeight)
  const depart = clamp01((viewportHeight - bottom) / viewportHeight)
  return easeInOut(approach) * (1 - easeInOut(depart))
}

/**
 * How solid the card is at a given presence.
 *
 * It is drawn at the docked size and does not travel, so it belongs to the
 * resting state and not to the journey. Fading it linearly with presence left a
 * rectangle sitting under a globe four times its size for most of the travel,
 * which read as a stray frame rather than as a card. It arrives instead only
 * once the globe is nearly home.
 */
export const DOCK_CARD_AT = 0.2

export function dockCardOpacity(presence: number): number {
  return clamp01((DOCK_CARD_AT - presence) / DOCK_CARD_AT)
}

/** The transform that takes the full frame layer to where presence says it is. */
export function dockTransform(presence: number) {
  const scale = lerp(DOCK_SCALE, 1, presence)
  const inset = (1 - presence) * DOCK_MARGIN
  return `translate3d(${-inset.toFixed(2)}px, ${-inset.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
}

/** Far enough out that the camera never ends up inside the sphere. */
export const MIN_ALTITUDE = 0.08

/**
 * How close the descent gets. Absolute rather than a fraction of the framing
 * altitude: the camera pulling back for the opening must not drag the descent
 * back with it, because being over Qatar is the whole point of that span. This
 * is close enough that Qatar, the rest of the Gulf and Iran are the frame, which
 * is the region the copy at that moment is talking about.
 */
export const DESCENT_ALTITUDE = 0.5

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
 * Altitude for any point in the sequence. Held at the framing altitude for the
 * whole globe and the dissection, then down to Doha.
 *
 * A pure function of the scroll position, which is what lets the camera find
 * its own way back when a reader scrolls up: there is no state to restore.
 */
export function altitudeAt(p: number, opening: number): number {
  return lerp(
    opening,
    DESCENT_ALTITUDE,
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
 * `from` and `to` are multiples of the globe radius. They travel to 1.25 and
 * 1.5, which is far enough to read as separation now the camera frames the
 * sphere against the viewport height and its limb is in the frame. They were
 * briefly cut to 1.06 and 1.12, when the camera sat close enough that no limb
 * was visible and therefore no shell silhouette could be either; that framing
 * is gone and so is the reason for the small numbers.
 *
 * Each shell is a faint fill, which is what makes it read as a layer rather
 * than a cage, and a graticule, which is what makes the movement legible.
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
    to: 1.5,
    separate: [0.2, 0.34],
    opacityPeak: 0.1,
    opacityEnd: 0.03,
    graticuleStep: 20,
  },
  {
    id: 'regional',
    from: 1.02,
    to: 1.25,
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
