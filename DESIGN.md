# Design

The chosen system is **Editorial**, selected by the project lead on 25 August 2026 from three candidates rendered across the full homepage and the corpus table. The two rejected systems have been deleted.

Everything below lives as CSS custom properties in [app/globals.css](app/globals.css). **Components use the tokens, never a raw value.** Fonts are loaded in [app/fonts.ts](app/fonts.ts).

## The direction

A text serif sets the headings against an institutional grotesque body, on a warm near black ground. The reference is a research journal, not a product site. The serif carries the argument, the grotesque carries the evidence, and a monospace carries anything numeric so that dates and counts read as data rather than as prose.

The ground is warm rather than blue black. A blue black surface pulls toward the console and dashboard register, which is the wrong lane for a research programme and is close to the anti references.

## Confirmed constraints

These came from the project lead and bind every later decision.

- Dark surface, because the globe sits on it.
- One accent only. It must work as body text on dark and as a data fill on country polygons at varying opacity.
- A second colour used on the globe only, distinguishing evidence that exists from evidence this project is creating.
- Inter, DM Sans, Poppins, Montserrat and Geist are rejected.
- Anti references: startup landing pages, consultancy sites, and anything with a purple to blue gradient.
- The lane is institutional research, closer to a university research centre or a policy institute than to a product company.
- WCAG 2.1 AA, binding.
- Motion only in the globe sequence, and only through transform and opacity. Nothing else on the site moves.

## Colour

Every value was checked with the WCAG contrast formula against both the base and the raised surface before being committed. Ratios are recorded so a later change can be checked the same way.

| Token | Value | On surface | On raised | Use |
|---|---|---|---|---|
| `--ag-surface` | `#12100e` | | | Page ground |
| `--ag-surface-raised` | `#1b1815` | | | Cards, the globe well, grid cells |
| `--ag-ink` | `#ece7df` | 15.42:1 | 14.36:1 | Body and headings |
| `--ag-ink-muted` | `#a8a096` | 7.35:1 | 6.85:1 | Metadata, labels, roadmap dates |
| `--ag-accent` | `#d9a441` | 8.44:1 | 7.86:1 | The single accent |
| `--ag-accent-dim` | `#a87f31` | 5.19:1 | 4.84:1 | The accent held back. Still AA for text. |
| `--ag-rule` | `#726b60` | 3.60:1 | 3.36:1 | Dividers and borders |

The accent is a brass. It sits far from the banned purple to blue register, reads as an instrument colour rather than a brand colour, and holds up when dropped in opacity over a dark sphere, which is what the globe asks of it.

`--ag-rule` is set above 3:1 on both surfaces so dividers meet the non text contrast requirement of WCAG 1.4.11 where they separate content rather than decorate it.

`--ag-accent-dim` clears 4.5:1 on both surfaces, so it may carry text where the full accent would be too loud.

## The globe

| Token | Value | On surface | Meaning |
|---|---|---|---|
| `--ag-globe-existing` | `#d9a441` | 8.44:1 | Evidence that exists. The corpus. Country polygons, extruded and lit by study count. |
| `--ag-globe-project` | `#7fd0c8` | 10.63:1 | Evidence this project is creating. The five work package nodes. |
| `--ag-globe-fill-floor` | `0.55` | | Minimum polygon fill opacity |
| `--ag-globe-scrim` | gradient | | Carries the ground back under the measure where the prose crosses the sphere |

The two globe colours were checked under simulated deuteranopia and protanopia using the Viénot dichromat transform and compared in CIE Lab. Brass against teal scores deltaE 71 in normal vision, 68 under deuteranopia and 55 under protanopia. Anything under 15 would have been a failure.

**The opacity floor is not optional.** Below 55 percent, the accent over this surface drops under 3:1 and stops being perceivable. Polygon fill opacity must scale between 0.55 and 1, never from 0, or countries holding one or two studies will disappear from the map. Given the corpus tops out at 31 studies for the United States and 66 countries appear at all, most countries sit near the floor, so this determines whether the map reads at all.

Colour is never the only channel separating the two categories: existing evidence is an extruded polygon, project evidence is a point node.

**Qatar is drawn as an outline in the accent at 0.6, with no fill.** It holds zero records, so under the ordinary rules it is painted as land like any other country the corpus does not reach, and at the bottom of the descent the reader cannot find the subject of the project. Outlined and empty, it reads as present and empty rather than as absent, which is what the sequence is about. It is the one country with a rule of its own, and the code carries it as `SUBJECT_CODE` rather than as a literal.

**Extrusion is a world scale device only.** The bar heights read as a count when the whole sphere is in frame and turn into walls across the map close in, so they come down to flat on the way to Doha and the fill carries the count alone from there.

**The sphere is offset right in the canvas, not centred.** The prose holds the left margin and the globe moves off it. This is the whole of the contrast answer on wide screens: a scrim heavy enough to carry ink to 4.5:1 over a lit polygon would take the globe down to nothing, which defeats the point of having one. Under 900 pixels there is no room for both, so the globe drops to 0.32 opacity and reads as texture rather than as a map, and the scrim goes flat and carries the contrast on its own.

## Type

| Token | Family | Use |
|---|---|---|
| `--ag-font-heading` | Newsreader | h1, h2, h3 |
| `--ag-font-body` | Public Sans | Everything else |
| `--ag-font-mono` | IBM Plex Mono | Dates, counts, field labels, metadata lines |

Newsreader is a text serif rather than a display serif, so it holds at section heading sizes without turning decorative. Public Sans is an institutional grotesque with a wide enough range to carry long prose. IBM Plex Mono marks anything the reader should treat as data.

The heading rule lives inside `@layer base` so an explicit utility such as `font-mono` still wins. Without that, the roadmap dates render in the serif.

Scale, in `rem`, on a 1.25 ratio from a 1rem base:

| Token | Size | Use |
|---|---|---|
| `--ag-text-xs` | 0.8 | Labels, case numbers |
| `--ag-text-sm` | 0.9 | Metadata, notes, nav |
| `--ag-text-base` | 1 | Body |
| `--ag-text-lg` | 1.25 | Standfirst, section intros |
| `--ag-text-xl` | 1.6 | Sub headings |
| `--ag-text-2xl` | 2 | Section headings |
| `--ag-text-3xl` | 3 | Page title |

Body leading is 1.65. Measure is capped at `--ag-measure`, 68 characters, on every run of prose.

Headings are weight 600 with `-0.01em` tracking.

**No text transform anywhere.** Uppercasing alters the copy as displayed, and the hero metadata line and the team labels carry people's names and titles.

## Space

One scale, in `rem`. Sections use `--ag-space-3xl` above and below on wide screens.

| Token | Value |
|---|---|
| `--ag-space-xs` | 0.5 |
| `--ag-space-sm` | 0.75 |
| `--ag-space-md` | 1.5 |
| `--ag-space-lg` | 2.5 |
| `--ag-space-xl` | 4 |
| `--ag-space-2xl` | 6 |
| `--ag-space-3xl` | 8 |

## Portraits

Headshots arrive from different places in different registers: HBKU studio portraits on grey, and outdoor photographs from partner organisations. Mixed quality is the fastest way to make a professional site look amateur, so **every portrait gets the same treatment and none gets special handling**.

| Token | Value |
|---|---|
| `--ag-portrait-filter` | `grayscale(1) contrast(1.05) brightness(0.98)` |

- One square frame, 96 pixels, bordered in `--ag-rule` over `--ag-surface`.
- `object-fit: cover` with `object-position: center 28%`, so faces land in frame on both near square studio shots and tall portraits.
- Full desaturation. It unifies a grey studio backdrop with a blossom tree and lets the single accent stay the only colour on the page.
- The frame is drawn even where no headshot has been supplied, so the grid does not go ragged. Three partners are in that state.
- Images are stored at 256 pixels wide in webp. Serve them as plain `img` tags with explicit width and height, not through `next/image`: at this size the optimizer buys nothing and its lazy loading did not resolve reliably.

Provenance for every file is in `content/headshot sources.json`.

## Rules and grids

Grids draw their rules per cell, with a top and left border on the container and a right and bottom border on each cell. **Do not paint the gap.** A grid with `gap-px` over a rule coloured background leaves a filled slab wherever an odd item count leaves an empty cell, which is what happened to the seven investigators and five partners.

## Hierarchy decisions already made

The roadmap dates are muted and monospace; the activity carries full ink. The dates are scaffolding, the activity is the content.

## Motion

One piece of the site moves: the globe sequence. Everything else is still, and `globals.css` keeps a blanket rule switching CSS transitions and animations off so nothing else acquires motion by accident. The sequence is driven from JavaScript, which writes inline style, so that rule does not touch it.

**Transform and opacity only.** Nothing in the sequence animates a property that costs layout or paint. On the page that means `opacity` and `translate3d`; in the scene it means mesh scale and material opacity.

**The pin is CSS sticky, not a ScrollTrigger pin.** ScrollTrigger's pin lifts the element into a spacer, which fights the negative margin that puts the prose over the globe. Sticky needs neither and releases at the container bottom on its own, which is where the handover belongs. GSAP still owns the choreography; ScrollTrigger only reports the position, and Lenis and ScrollTrigger share one scroll position through `lenis.on('scroll', ScrollTrigger.update)`.

**The container runs from the top of the hero to the bottom of the globe well** in section five, and the position through it is a single value from 0 to 1. The four spans, the camera poses, the shell radii and the label timings all live in `lib/globe-sequence.ts` as plain numbers, so the choreography can be read and changed without opening a component.

| Span | What happens |
|---|---|
| 0.00 to 0.20 | Whole. Bare sphere, slow rotation, countries raised and lit by count. |
| 0.20 to 0.45 | Dissection. Two graticule shells separate outward, the outer leaving first. Labels arrive as each detaches. |
| 0.45 to 0.70 | Descent. Camera to Doha at altitude 0.9. Shells fade out, extrusion goes flat. |
| 0.70 to 1.00 | Breakout. Five work package nodes arrive around Doha in the second colour. |

**Shells are told apart by graticule spacing and opacity, not by line width.** WebGL caps line width at one pixel on every mainstream implementation, so weight has to be carried by how much line there is: the outer shell is ruled every 30 degrees and drawn faint, the middle one every 15 degrees and brighter.

**Annotations sit above the prose.** They are annotations on the globe, so the section rules and the globe well frame have to pass behind them rather than through them. On wide screens they hold the right gutter, clear of the measure; under 900 pixels there is no gutter, so they anchor to the foot of the viewport. They are opaque, on the raised surface, because a translucent panel is fine over the sphere and unreadable over prose.

**One instance.** The globe is mounted once, in the pinned layer. The well in section five is an empty frame it comes to rest in. The globe note stays directly under it, which PRODUCT.md marks as not optional.

Still open: the handover at the end of the pin, and the reduced motion path, which currently holds the sequence at its last state rather than being the deliberate alternative PRODUCT.md asks for.

## Copy rules that constrain design

All user facing prose lives in content files. `content/home.json` is a verbatim transcription of `docs/website content.md` and is verified against it by script. Design serves the copy and never edits it, including through styling.

## Still open

- The Hamad Bin Khalifa University identity, which waits on the brand pack. Nothing here anticipates it.
- Vertical rhythm. The homepage runs to roughly 12,800 pixels at 1440 and 18,300 at 390, which is a long scroll for a reviewer.
- Component patterns beyond what the eleven homepage sections and the corpus table needed.
