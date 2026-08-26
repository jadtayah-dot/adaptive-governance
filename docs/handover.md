# Handover

Working state as of 26 August 2026. Read `PRODUCT.md` and `DESIGN.md` first: they carry the decisions. This file carries only what is in flight, what is broken, and how to check your work.

## Where things stand

The homepage narrative, the globe sequence and the corpus repository are built. The globe is the piece that has had the most iteration and it is the piece most likely to need more.

The globe runs as one instance in a pinned region inside section five, four viewport heights of scroll, driven by a single 0 to 1 position. Four spans: whole, dissection, descent to Doha, five work package nodes. At the end the pin releases, the camera returns to a whole globe over 800ms and the globe becomes interactive for the rest of the page. Clicking a country opens its records beside the globe rather than navigating to `/corpus`.

Below 1200 pixels none of that runs. The site serves a still rendered from the live scene plus the same copy as ordinary text. `MIN_LIVE_WIDTH` in `lib/globe-sequence.ts` is the single number, and `tests/homepage.py` asserts both sides of it.

## Run the checks

Everything needs `npm run dev` running first except the palette check.

    python tests/palette.py           # token contrast, fill scale ordering, dichromat separation
    python tests/homepage.py          # copy on the page, section ids, both sides of MIN_LIVE_WIDTH
    python "tests/globe contrast.py"  # real rendered pixels behind every passage, both widths
    node "scripts/check globe still.mjs"   # also runs as prebuild
    npm run build

All four pass at `6927557`.

Regenerate the still whenever the corpus or the globe changes, and commit the result:

    python "scripts/globe still.py"

## Open, in rough order of how much they matter

**The white rectangle.** A card shaped hole in the globe where a passage has faded out, visible in the dissection frames at the lower left. It tracks the passage layer but is not an element: nothing in the DOM paints there. Zero opacity, `visibility: hidden`, `display: none` and unmounting the element all leave it, and only removing the whole overlay clears it. It was invisible on the old dark ground because the hole showed a near black page. **Check it in a browser with a real GPU before spending more on it**, because it may only exist in headless software rendering.

**The Vercel deploy is unverified.** Commits are on GitHub at `jadtayah-dot/adaptive-governance`. This checkout has no `.vercel` directory and no `vercel.json`, so nothing here is linked to a project, and it has never been confirmed that a Vercel project is connected to this repo or building from `main`. Separately, `adaptivegovernance.info` resolves to a Palo Alto DNS sinkhole on the university network, so it cannot be reached from campus at all. Both need sorting before anyone is asked to look at a live site.

**The team count.** The project lead asked for the section nine intro to say eight investigators. Seven render, seven are in `content/home.json`, and `PRODUCT.md` records seven as settled: Tok, Zaidan, Dimitropoulos, Mikros, Al Fadala, Mohamed, Olaoye. The change was held rather than made, because writing eight would contradict the list directly beneath it. It needs either a name to add or a correction to the request.

**The hero is two thirds empty at 1920.** Sections span the viewport now and the measure is capped on the prose, which is right for the grids and the globe and leaves a large void beside a text only section. Wants a deliberate answer rather than a cap put back on the container.

**Grid card text has no measure.** Only prose runs are capped, so at 1920 the definition and objective cards run long lines. Cap the card text, not the container.

**Reduced motion is a holding position.** It pins the sequence at its last state. `PRODUCT.md` asks for a deliberate alternative rather than a switched off version, and that is still open.

**The globe is mouse only.** The canvas is `aria-hidden` and takes no focus. The keyboard path is the country index beside the globe, which reaches the same filtered views and hands the globe over on focus, and the corpus table carries the same data. That was accepted as the answer, but the canvas itself is still unreachable.

**Below 1200 the shell separation is absent.** One still cannot carry it. `PRODUCT.md` records three stills in document order as the likely answer, to be built with the reduced motion path since it is the same problem.

**`/corpus` is unstyled.** It describes itself that way on the page. It is the full record for deep use and citation and has had no design pass.

**Routes that do not exist.** `/outputs`, `/events` and `/team` are linked from section twelve and return 404.

## Things that will bite you

Written down because each one cost time.

- **globe.gl parses polygon colours with a library that returns null for anything it does not recognise, then reads a property off the null.** An `rgb()` string crashes the polygon layer. Hand it hex.
- **OrbitControls skips its entire update when disabled, and auto rotate lives inside that update.** Disabling controls to stop pointer input also stops the rotation. Turn off `enableRotate`, `enablePan` and `enableZoom` instead.
- **Writing the camera every frame fights auto rotate for the same property.** Below the descent, latitude and altitude do not change, so write them only when they are wrong.
- **Changing the polygon altitude accessor rebuilds all 177 polygons.** It cannot happen per frame. Extrusion flattens once on a threshold and globe.gl's own transition covers it.
- **react-globe.gl binds only fifteen methods onto the ref.** `globeOffset` is not one of them, so it can only be set through a prop, which means a React render per frame if you try to animate it.
- **Do not hash files without normalising line endings.** git hands them out with CRLF on Windows and LF elsewhere, which broke the build gate on a fresh clone. Both sides of the gate normalise now and `.gitattributes` pins text to LF.
- **The passages are placed, not panelled, by history.** On the dark ground placement alone met 4.5:1. On white it does not, so they sit on cards. `tests/globe contrast.py` reads a passage against its card where it has one and against the rendered pixels where it does not.

## How the project lead works

Worth matching. Every instruction has been specific and every review has been detailed, so vagueness costs more than it saves.

- Say what is wrong before they look. Every round has ended with a request for that, and it is expected unprompted.
- Measure rather than eyeball. Contrast, altitude, colour separation and rotation have all been settled with numbers, and the checks in `tests/` exist because of it.
- Commit with explicit paths, never `git add -A`, and write a message that says what is actually in the change.
- Copy lives in content files. Never rewrite copy while editing layout. If copy needs to change, say so and wait.
- If an instruction rests on a premise that turns out to be wrong, say so rather than complying. That has happened twice and was wanted both times.
