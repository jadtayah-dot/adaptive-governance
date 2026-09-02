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
 * This was 1200. The reasoning was that the sequence needs three things across
 * the viewport at once, a 68 character measure, a sphere that never sits under
 * it, and a column for the annotations that never enters the measure, which at
 * this type scale is about 800 pixels and about 210, and that the three stop
 * fitting below roughly 1200.
 *
 * All of that is still true, and ranging them across a phone is still
 * impossible. What changed is that ranging them across is not the only
 * arrangement. Below NARROW_WIDTH the same three are stacked down the viewport
 * instead: the sphere holds a band at the top, the passages sit directly under
 * it, and the prose runs beneath both. Nothing is laid over the middle of the
 * globe, which is the rule 1200 was really protecting, and a phone gets the
 * argument rather than a picture of where it ended.
 *
 * The static path remains, for prefers reduced motion and for anything narrower
 * than a phone, and it is still the same three frames.
 */
export const MIN_LIVE_WIDTH = 360

/**
 * At and above this the sequence ranges across the viewport. Below it, it
 * stacks. See MIN_LIVE_WIDTH for why there are two arrangements rather than an
 * arrangement and a photograph.
 */
export const NARROW_WIDTH = 1200

/** The share of the viewport the globe holds when the sequence is stacked. */
export const NARROW_GLOBE_BAND = '58svh'

/**
 * The three frames the static path serves instead of the sequence.
 *
 * Below MIN_LIVE_WIDTH, and under prefers reduced motion, there is no scroll to
 * drive anything. What was served was one still of the end state and a table of
 * the three layer names, which is not a quieter version of the argument: the
 * move the argument is built on, the globe coming apart and then being descended
 * into, was simply absent. Three frames in document order are that move
 * expressed without scroll.
 *
 * `at` is a position in the sequence, so these are rendered from the same scene
 * the wide path runs, by `scripts/globe still.py`. Nothing here is drawn by
 * hand. Change one of these numbers and the picture changes with it.
 */
/**
 * What the frames are rendered at. The live path's shape, deliberately: the
 * sphere is framed against the viewport height, so a square canvas gives a
 * different composition from the one a reader on the live path sees.
 */
export const STILL_RENDER = { width: 1440, height: 900 }

/**
 * `crop` is the side of a centred square kept from the render, or 0 to keep the
 * whole frame.
 *
 * Only the descent is cropped, and only because it has to be. The still is
 * served at about a third of the width the live scene has, and uncropped, Qatar
 * comes out around fifteen pixels on a phone and the outline the whole descent
 * is built around cannot be seen. The crop is centred on the camera target,
 * which is Doha, so it is still the scene rather than a composition.
 *
 * The other two must not be cropped. The shells travel to 1.5 radii and the
 * sphere is 0.88 of the frame height, so the dissection is wider than the frame
 * is tall: cropping it square threw both shells away and left a close up of
 * west Africa, which is a picture of nothing the caption is talking about.
 */
export const STILL_FRAMES = [
  /** Bare sphere, countries raised and lit by count. */
  { id: 'whole', at: 0.1, crop: 0 },
  /** Both shells out, at the end of the dissection and before the descent. */
  { id: 'separated', at: 0.42, crop: 0 },
  /** Over Doha, extrusion flat, Qatar outlined and empty, the five nodes up. */
  { id: 'descended', at: 0.95, crop: 880 },
] as const

export type StillFrame = (typeof STILL_FRAMES)[number]['id']

/** The pixel size a frame is written at, so the page can size the img. */
export function stillSize(crop: number) {
  return crop > 0
    ? { width: crop, height: crop }
    : { width: STILL_RENDER.width, height: STILL_RENDER.height }
}

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
  The globe behind the page.

  It is mounted once and holds the viewport from the hero to the footer. Behind
  every section it is a faint wash, drawn under the content; approaching section
  five it comes forward to full strength and fills the frame, plays the
  argument, and recedes again once the well has gone by.

  What changes is opacity and a little scale, both compositor properties. It was
  briefly a small card docked in a corner, which meant scaling the layer to a
  sixth and gave the page a right margin to keep out of. The wash needs neither:
  the globe never moves, so nothing has to make room for it and the grids are
  full width again.

  Being behind the copy is the thing the earlier margin layout needed a scrim
  for. There is no scrim. Instead BACKGROUND_OPACITY is bounded by contrast:
  tests/palette.py composites the darkest colour the globe can draw at that
  opacity over the darkest end of the page gradient and requires every text
  token to clear 4.5:1 against the result.
*/

/**
 * How solid the globe is behind ordinary page content.
 *
 * Set by the contrast bound rather than by eye. The accent is the binding case:
 * it clears 4.5:1 on the page by the smallest margin of any text colour, and it
 * carries the hero subtitle, which sits directly over the globe.
 */
export const BACKGROUND_OPACITY = 0.08

/**
 * How large the globe is behind the page, against filling the frame.
 *
 * A little smaller, so that coming forward is a move rather than only a change
 * of strength. Not much smaller: the sphere is framed against the viewport
 * height and a background that shrinks reads as a different object arriving
 * rather than the same one approaching.
 */
export const BACKGROUND_SCALE = 0.86

/**
 * Presence at or above which the globe takes pointer input.
 *
 * Below this it is a wash behind the copy, and a tooltip that opens because the
 * pointer crossed a faint shape under a paragraph is not a feature. In practice
 * the content layer settles this as well: every section paints above the globe
 * and takes its own pointer events, so only section five, whose runway and well
 * are empty and transparent to the pointer, ever hands them through.
 */
export const SUBJECT_PRESENCE = 0.6

/*
  Size and strength are not on the same curve, and the reason is contrast.

  Size runs across the whole viewport height either side of the argument, which
  is the part a reader sees as the globe approaching and withdrawing. Strength
  cannot: for most of that travel there is still page copy on screen, and a
  globe at half opacity behind a paragraph fails 4.5:1 by a wide margin.

  So strength is measured in pixels of copy rather than in presence, because
  pixels of copy is the thing that actually decides it. It rises only once the
  container has pushed the section above it off the top of the screen, and falls
  as soon as the section below it starts to appear at the bottom. Both numbers
  come from the layout: sections carry 128 pixels of padding at this breakpoint,
  and the corpus note directly under the well carries none at all, which is why
  the fall is so much shorter than the rise.

  These are not guesses. tests/page contrast.py samples the real pixels behind
  every run of copy on the page, at fine steps across both, and fails under
  4.5:1.
*/

/** Container top, in pixels, over which strength goes from background to full. */
export const STRENGTH_RISE_FROM = 240
export const STRENGTH_RISE_TO = 110
/** Pixels of the section below showing before strength is back to background. */
export const STRENGTH_FALL_OVER = 80

export type Stage = {
  /** 0 is the wash behind the page, 1 is the subject filling the frame. */
  presence: number
  /** 0 is BACKGROUND_OPACITY, 1 is solid. */
  strength: number
}

/**
 * Where the globe is and how solid it is, from where the argument container
 * sits in the viewport. A pure function of two numbers off one rectangle, which
 * is what lets the reader scroll up and find it where they left it.
 */
export function stageAt(top: number, bottom: number, viewportHeight: number): Stage {
  const approach = clamp01((viewportHeight - top) / viewportHeight)
  const depart = clamp01((viewportHeight - bottom) / viewportHeight)
  const presence = easeInOut(approach) * (1 - easeInOut(depart))

  const rise = clamp01((STRENGTH_RISE_FROM - top) / (STRENGTH_RISE_FROM - STRENGTH_RISE_TO))
  const fall = clamp01((viewportHeight - bottom) / STRENGTH_FALL_OVER)
  const strength = easeInOut(rise) * (1 - easeInOut(fall))

  return { presence, strength }
}

/** The transform that takes the layer to where presence says it is. */
export function stageTransform(presence: number) {
  return `scale(${lerp(BACKGROUND_SCALE, 1, presence).toFixed(4)})`
}

/** How solid the globe is at a given strength. */
export function stageOpacity(strength: number) {
  return lerp(BACKGROUND_OPACITY, 1, strength)
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
