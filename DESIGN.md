# Design

The system was **Editorial**, selected by the project lead on 25 August 2026 from three candidates. On 26 August 2026 the project lead asked for the Hamad Bin Khalifa University identity instead, so the palette and the type are now the university's and Editorial survives only in the layout, the grid and the rules.

Everything below lives as CSS custom properties in [app/globals.css](app/globals.css). **Components use the tokens, never a raw value.** Fonts are loaded in [app/fonts.ts](app/fonts.ts).

## The direction

The university's, read off hbku.edu.qa on 26 August 2026 by loading the page and reading the computed styles, not from a brand pack. A white ground, near black text, a grey secondary, a blue, and Roboto for everything.

That replaced a deliberately different system, and the losses are worth writing down because they were not accidents. The site used a text serif for headings, an institutional grotesque for body and a monospace for anything numeric, so that dates and counts read as data rather than as prose. Roboto carries all three now, and that distinction is gone. The ground was a warm near black chosen so the globe could sit on it; it is white, and the globe's whole colour model had to be rebuilt around that.

**A website is not a brand pack.** These values are evidence of what the university serves on the web today. If an actual brand standard exists it beats this, and the values here should be replaced rather than reconciled.

## Confirmed constraints

These came from the project lead and bind every later decision.

- The palette and the type are the university's, taken from hbku.edu.qa.
- One accent only. It must work as body text on white and as a data fill on country polygons.
- A second colour used on the globe only, distinguishing evidence that exists from evidence this project is creating.
- The lane is institutional research, closer to a university research centre or a policy institute than to a product company.
- WCAG 2.1 AA, binding.
- Motion only in the globe sequence, and only through transform and opacity. Nothing else on the site moves.

Superseded on 26 August 2026, and kept here because a lot was built on them:

- ~~Dark surface, because the globe sits on it.~~ The ground is white. This is the constraint the rest of the globe was derived from, so its removal cost the most: see the fill scale below.
- ~~Inter, DM Sans, Poppins, Montserrat and Geist are rejected.~~ The rejection was of a register, and Roboto sits squarely in it. The university's identity outranked the register.
- ~~Anti references: startup landing pages, consultancy sites, and anything with a purple to blue gradient.~~ The accent is now a blue. It is the university's blue, flat, with no gradient anywhere.

## Colour

Every value is checked by `tests/palette.py`, which reads the tokens out of `globals.css` and recomputes these ratios. The numbers below are what it prints.

| Token | Value | On surface | On raised | Use |
|---|---|---|---|---|
| `--ag-surface` | `#ffffff` | | | Page ground. The university's. |
| `--ag-surface-raised` | `#edeeee` | | | Cards, grid cells, and the globe's sphere |
| `--ag-ink` | `#151515` | 18.26:1 | 15.71:1 | Body and headings |
| `--ag-ink-muted` | `#515966` | 7.07:1 | 6.08:1 | Metadata, labels, roadmap dates |
| `--ag-accent` | `#00699e` | 5.98:1 | 5.14:1 | The single accent |
| `--ag-accent-dim` | `#0088ce` | 3.88:1 | 3.34:1 | The university's own blue. Non text only. |
| `--ag-rule` | `#767c85` | 4.21:1 | 3.62:1 | Dividers and borders |

**The university's blue cannot carry body text.** `#0088ce` reaches 3.88:1 on white, under the 4.5:1 this project holds itself to, so it is not the accent. The accent is that blue darkened until it clears on both surfaces, and `#0088ce` is kept as the dim for anything the 3:1 non text rule covers: borders, large text, and the globe's own fill scale.

Note that the relationship inverted with the ground. On the old dark surface the dim was darker than the accent; on white it is lighter. The names stayed, because renaming would have rippled through every component for nothing.

`--ag-rule` is set above 3:1 on both surfaces so dividers meet WCAG 1.4.11 where they separate content rather than decorate it.

## The globe

| Token | Value | On surface | Meaning |
|---|---|---|---|
| `--ag-globe-existing` | `#0088ce` | 3.88:1 | Evidence that exists. The corpus. |
| `--ag-globe-project` | `#c2410c` | 5.18:1 | Evidence this project is creating. The five work package nodes. |
| `--ag-globe-fill-min` | `#1f93d8` | 3.37:1 | One study. The thinnest a country may be drawn. |
| `--ag-globe-fill-max` | `#004a70` | 9.49:1 | Thirty one studies, which is the corpus maximum. |
| `--ag-globe-land` | `#8e949d` | 3.06:1 | Land the corpus does not reach. |

The two globe colours are checked under simulated deuteranopia and protanopia using the Viénot dichromat transform and compared in CIE Lab. Blue against rust scores deltaE 113 in normal vision, 113 under deuteranopia and 88 under protanopia. Anything under 15 would be a failure. Blue against orange is the most robust pair there is for a dichromat, which is the one thing the move to a blue accent made easier.

**The fill is a walk between two colours, not one colour at varying opacity.** That is the piece the white ground broke. On the old dark surface a brass at 55 percent alpha was the floor below which it dropped under 3:1, and the scale ran from there to solid. On white, a blue at low alpha goes under 3:1 against the page long before it stops being visible, so alpha is the wrong axis. Every country the corpus reaches is drawn somewhere between `--ag-globe-fill-min` and `--ag-globe-fill-max`, both of which clear 3:1 against the page, and the scale is lightness rather than transparency.

**The direction of the scale inverted too.** On the dark ground more studies meant brighter. On white more studies means darker, and land the corpus does not reach is the lightest thing on the map after the sphere itself. Given the corpus tops out at 31 for the United States and 66 countries appear at all, most countries sit near the light end, so this is what decides whether the map reads.

**The sphere is `--ag-surface-raised`, not the page colour.** A white sphere on a white page has no silhouette and stops being an object. It is a low contrast edge even so, 1.16:1 against the page, which is the cost of a light ground and cannot be fixed without darkening either the sphere or the page.

Colour is never the only channel separating the two categories: existing evidence is an extruded polygon, project evidence is a point node.

**Qatar is drawn as an outline in the accent at 0.6, with no fill.** It holds zero records, so under the ordinary rules it is painted as land like any other country the corpus does not reach, and at the bottom of the descent the reader cannot find the subject of the project. Outlined and empty, it reads as present and empty rather than as absent, which is what the sequence is about. It is the one country with a rule of its own, and the code carries it as `SUBJECT_CODE` rather than as a literal.

**Extrusion is a world scale device only.** The bar heights read as a count when the whole sphere is in frame and turn into walls across the map close in, so they come down to flat on the way to Doha and the fill carries the count alone from there.

**The sphere fills the frame and is centred.** Apparent size is set by camera altitude, because globe.gl frames by field of view and a wider canvas buys empty pixels rather than reach. At the opening altitude the sphere covers roughly nine tenths of the viewport height. There is no offset and no scrim. Both existed to keep a column of prose legible beside the globe, and no prose runs beside it any more.

## Type

| Token | Family | Use |
|---|---|---|
| `--ag-font-heading` | Roboto | h1, h2, h3 |
| `--ag-font-body` | Roboto | Everything else |
| `--ag-font-mono` | Roboto | Dates, counts, field labels, metadata lines |

Roboto is what hbku.edu.qa serves, at 300, 400, 500 and 700. It is under the Apache licence, so `next/font/google` self hosts it and nothing is loaded from a third party or bought.

**All three tokens point at the same family, and that is a real loss.** The three were a serif for the argument, a grotesque for the evidence and a monospace for anything numeric, so that dates, counts and field labels read as data rather than as prose. The tokens are kept pointing at one family rather than collapsed into a single token, so restoring the distinction later is a change to this file rather than to every component.

Weight carries what the families used to: headings are 700, body is 400, and the metadata lines that were monospace are held at `--ag-text-xs` or `--ag-text-sm` in `--ag-ink-muted`. Numerals no longer align in a column, which is visible in the country index beside the globe.

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

Headings are weight 700 with `-0.01em` tracking.

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

**The argument is its own scroll, inside section five.** It is a pinned region of four viewport heights with the globe filling the frame and nothing over it but the sequence naming itself. The long form prose runs above and below as ordinary page. It was once the five prose sections scrolling past a globe held in the right margin, and it read as wallpaper: a globe with a column of paragraphs beside it that never refer to it is decoration. Sitting inside section five keeps the eleven sections in the order the copy file fixes, and keeps the globe note directly under the well.

**The pin is CSS sticky, not a ScrollTrigger pin.** ScrollTrigger's pin lifts the element into a spacer; sticky needs neither and releases at the container bottom on its own, which is where the handover belongs. GSAP still owns the choreography, ScrollTrigger only reports the position, and Lenis and ScrollTrigger share one scroll position through `lenis.on('scroll', ScrollTrigger.update)`.

The position through the pin is a single value from 0 to 1. The spans, the camera track and the shell radii live in `lib/globe-sequence.ts`, and the passage timings and placements in `components/GlobeStage.tsx`, as plain numbers.

| Span | What happens |
|---|---|
| 0.00 to 0.20 | Whole. Bare sphere, slow rotation, countries raised and lit by count. |
| 0.20 to 0.45 | Dissection. Two translucent shells separate outward to 1.25 and 1.5, the outer leaving first. |
| 0.45 to 0.70 | Descent. Camera to Doha at altitude 0.9. Shells fade out, extrusion goes flat. |
| 0.70 to 1.00 | Breakout. Five work package nodes arrive around Doha in the second colour. |

**The camera holds its altitude until the descent.** It does not back off for the dissection. The shells were brought in to travel less instead, because a globe that shrinks to make room for its own diagram is back to being small. Coming apart is the point, not how far they get.

**Shells are translucent surfaces, not wireframes.** A wireframe shell can only ever be hairlines: WebGL caps line width at one pixel on every mainstream implementation, so no amount of opacity makes a cage read as a layer. Each shell is a faintly filled sphere, single sided so one pass is one layer of alpha, and its silhouette against the ground is the edge.

**Passages are placed where the sphere is not, at that moment.** No panel behind them, no scrim under them. A circle in a rectangle always leaves dark corners, and once the camera is over the Gulf it leaves a dark half, so the text moves through the sequence and the globe does not. Contrast is still 4.5:1 and still binding, and because placement is what meets it, `tests/globe contrast.py` reads the real rendered pixels behind every passage at both widths and fails under 4.5:1. Passages sharing a position share one box and stack inside it rather than carrying offsets tuned by hand against each other's heights.

**One instance.** The globe is mounted once, in the pinned layer. The well in section five is where it comes to rest, and above the live width it carries no frame: a box drawn around a sphere larger than the box only cuts across it. Below that width the well holds the still and keeps its frame.

**At the handover the pin releases**, the camera returns to a whole globe over 800ms, the passages clear, and the globe becomes interactive and stays interactive for the rest of the page. Hover gives a country name and study count, and a click filters the corpus. Countries the corpus does not reach are not clickable and are not dressed as though they were: no highlight, no pointer cursor, and the tooltip says the corpus holds none.

Still open: the reduced motion path, which holds the sequence at its last state rather than being the deliberate alternative PRODUCT.md asks for, and the keyboard path to the globe, which does not exist.

## Copy rules that constrain design

All user facing prose lives in content files. `content/home.json` is a verbatim transcription of `docs/website content.md` and is verified against it by script. Design serves the copy and never edits it, including through styling.

## Still open

- Whether an actual Hamad Bin Khalifa University brand pack exists. The palette and type here were read off the live site, which is evidence of the web presence and not a standard.
- Vertical rhythm. The homepage runs to roughly 12,800 pixels at 1440 and 18,300 at 390, which is a long scroll for a reviewer.
- Component patterns beyond what the eleven homepage sections and the corpus table needed.
