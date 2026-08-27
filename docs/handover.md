# Handover

Working state as of 27 August 2026, at `5d2daf3`. Read `PRODUCT.md` and `DESIGN.md` first: they carry the decisions. This file carries only what is in flight, what is waiting on the project lead, and how to check your work.

## Where things stand

The homepage, the globe, `/corpus` and `/outputs` are all built and all four routes work. Everything below is pushed to `main` at `jadtayah-dot/adaptive-governance`.

**The globe is behind the whole page.** One instance, fixed to the viewport, a faint wash under the content from the hero to the footer. It grows to fill the frame as the argument arrives in section five, plays the four spans unchanged, and recedes. Size and strength are on different curves and the reason is contrast: strength is measured in pixels of copy on screen, not in presence. There is a held screen after the well, `GlobeHold`, which is where the globe is interactive and where the reader can turn it.

**Below 1200, and under reduced motion at any width, there is no scene.** Both get the same three frames in document order, whole, separated and descended, rendered from the running scene. Which path runs is one CSS rule in `globals.css` keyed on `[data-globe-live]` and `[data-globe-static]`.

**`/corpus` is a distribution first and a table second.** A country ranking opening on fifteen with a control for all sixty six, four derived breakdowns, a year strip, a live count, and the table closed underneath. Resting on any group previews it everywhere else. Only `normativeStance` is a coded field; level, method and sector are grouped by rule in `lib/corpus-dimensions.ts`.

**`/outputs` publishes the first report.** `/events` and `/team` still return 404.

## Run the checks

Everything except the palette check needs `npm run dev` running.

    python tests/palette.py            # tokens, both gradient stops, the globe wash bound
    python tests/homepage.py           # copy, section ids, both sides of MIN_LIVE_WIDTH,
                                       # reduced motion, and the keyboard path to the globe
    python tests/corpus.py             # ten checks on the distribution, the preview,
                                       # the selections and the scroll behaviour
    python "tests/globe contrast.py"   # rendered pixels behind every sequence passage
    python "tests/page contrast.py"    # rendered pixels behind every run of copy
    node "scripts/check globe still.mjs"   # also runs as prebuild
    npm run build

All pass at `5d2daf3`.

Regenerate the three globe frames whenever the corpus or the globe changes, and commit the result. The build fails until you do:

    python "scripts/globe still.py"

`scripts/dimension coverage.mjs` prints how much of the corpus each grouping rule reaches, and the wording of anything it failed to place.

## Waiting on the project lead

Nothing below is a bug. Each one is a decision that is not mine to make, and several have been outstanding for days.

**Copy. All of it is mine and none of it is reviewed.** This is the largest item.

- `content/corpus page.json`, every string: the title, the standfirst, six `selection` strings, seven `ranking`, four `breakdowns`, thirteen `table`, two `years`. The `breakdowns.derivation` paragraph matters most, because it is what tells a reviewer that three of the four groupings are derived rather than coded.
- `lib/corpus-dimensions.ts`, every group name a reader sees: Supportive, Mixed, Neutral, Critical, Not reported; Local, Subnational, National, Transboundary, Global and international, Multilevel tiers not named; Case study, Interviews and fieldwork, Document and policy analysis, Review and synthesis, Quantitative and modelling, Conceptual and theoretical, Mixed methods; Water, Climate, Disaster risk and crisis, Marine and fisheries, Environment land and biodiversity, Food and agriculture, Urban planning and infrastructure, Health, Energy and extractives, Digital and data, Education, Public administration and law, Economy and livelihoods; and three "not classified" labels. These should probably move to a content file at the same time.
- `content/globe.json`, `stillAlt.whole` and `stillAlt.separated`. These are the entire description of two of the three frames for a reader using a screen reader.
- `content/outputs.json`, the `download` and `pages` labels.
- `content/review.json`, two figure headings and two notes. The three funnel stage labels are lifted verbatim from the sentence beside them.

**Where 1,172 belongs.** The copy used to say the search returned 1,172 records. The lead gave 6,481 as the number screened on 27 August, and both cannot be the top of the funnel, so 1,172 was removed rather than publish a contradiction. Either it is a stage between 6,481 and 272 and the copy should say which, or it is superseded.

**The report has no text layer.** `/outputs` publishes a 31 page policy report that is 31 full page images. It cannot be searched, quoted, indexed by Scholar or read aloud. Fixing it needs OCR, which needs Tesseract, which is not installed. The `summary` field in `content/outputs.json` is deliberately empty for the same reason: the report's own executive summary is on page two, but transcribing it out of an image risks putting errors on a page reviewers read.

**Translational or transnational.** The report cover reads "Translational" in the grant title where the site copy reads "transnational". The cover's wording is reproduced as it stands.

**Three sections are still two thirds empty.** Measured at 1920, the prose in `studies`, the hero and `collaborate` ends around x=675 and the rest of the line is nothing. The corpus section was filled with two figures. The others were not, because `PRODUCT.md` requires a visual to be a view of real data and there is no data that honestly belongs beside them: the `studies` copy is about governance in Qatar and every number here is about the literature. Filling them needs data that belongs there, permission for a diagram that is not a view of data, or a caption that makes a corpus reading honest in that position. The coded normative stance, where 160 of 217 studies are supportive, is the least dishonest candidate.

**The team count.** The lead asked for section nine to say eight investigators. Seven render, seven are in `content/home.json`, and `PRODUCT.md` records seven as settled. Needs a name to add or a correction to the request.

## Open, and mine to fix when asked

**The canvas takes no focus.** It is `aria-hidden`. The country index under the globe is the keyboard path and reaches every filtered view a click reaches, which is what 2.1.1 asks for, but a sighted reader who cannot use a mouse still cannot put focus on the sphere.

**A map click shows its records below the fold.** The index is ordinary page content now rather than an overlay beside the globe, which is what made it reachable at every width. The map still answers the click, since the chosen country keeps its accent outline, but the records are a scroll away.

**Singapore has no name.** `content/country names.json` holds 65 of the 66 countries, so SGP renders as a bare code in the ranking and in the index. The file is generated from Natural Earth 110m, which has no Singapore polygon, so the globe cannot draw it either.

**The wash is as dark as the globe allows.** `--ag-globe-fill-min` is a country holding one study and was only 3.37:1 on white. At `--ag-surface-deep` it has 3.04:1 against the 3:1 floor. One stop darker and both it and `--ag-accent-dim` fail. A stronger grey needs the fill scale darkened, which changes how the data reads, or the university's own blue darkened.

**`/corpus` deviations from the brief**, all deliberate: the live count is sticky at the top rather than fourth in the order, the buckets with no country are a companion ranking rather than mixed into the countries, and the table is closed on arrival.

**The Vercel deploy is still unverified.** No `.vercel` directory, no `vercel.json`, and it has never been confirmed that a project builds from `main`. `adaptivegovernance.info` resolves to a Palo Alto DNS sinkhole on the university network, so it cannot be reached from campus.

**`.claude/launch.json` is uncommitted.** Dev server config for the browser tools, not project work.

## Things that will bite you

Each of these cost real time. The older ones are still true.

- **globe.gl parses polygon colours with a library that returns null for anything it does not recognise, then reads a property off the null.** An `rgb()` string crashes the polygon layer. Hand it hex.
- **OrbitControls skips its entire update when disabled, and auto rotate lives inside that update.** Turn off `enableRotate`, `enablePan` and `enableZoom` instead.
- **Do not hash files without normalising line endings.** git hands them out with CRLF on Windows and LF elsewhere. Both sides of the still gate normalise, and `.gitattributes` pins text to LF.
- **`getBoundingClientRect` includes ancestor transforms.** The globe measured itself with it while an ancestor was scaled, so the scene reframed to the scaled size and was then scaled again. `offsetWidth` is the layout size and ignores transforms.
- **React invokes effects twice on mount in development, and simulates a remount.** Both bit the corpus entrance: the second invocation was mistaken for a change of selection and played the animation off screen, and then the unmount cleanup tore down an IntersectionObserver that was never rebuilt. Compare targets by identity, and pair an observer's setup and teardown in the same effect.
- **`onMouseEnter` fires when a row scrolls under a still pointer.** That is not pointing. Use one move listener and ignore moves whose coordinates did not change, because browsers re dispatch a move after a scroll so `:hover` can be recomputed.
- **Tailwind sorts arbitrary breakpoint variants ahead of named ones**, so `md:px-10` beat `min-[1200px]:pr-…` and the padding never applied. Put such rules in `globals.css`, which is imported after the utilities.
- **`m-0` on a figure cancels the margin `space-y` puts on the next sibling.** Use a flex gap, which is not a margin.
- **A JSX comment beside the root element makes two roots.** Put the comment above the `return`. This has been done twice.
- **Do not write source files through PowerShell `Set-Content`.** It mangles non ASCII: a non breaking space came back as `Â `. Use Python with an explicit `utf-8` encoding and `newline='\n'`.
- **The Bash tool in this environment loses its PATH.** Use the PowerShell tool.
- **Do not leave a file named `copy.py` in a scratch directory.** Python resolves the stdlib `copy` module to it and any import chain that touches `copy` runs your script instead.

## How the project lead works

Worth matching. Every instruction has been specific and every review detailed, so vagueness costs more than it saves.

- Say what is wrong before they look. Every round has ended with a request for that, and it is expected unprompted.
- Measure rather than eyeball. Contrast, altitude, colour separation, rotation, motion timing and the preview arithmetic have all been settled with numbers, and the checks in `tests/` exist because of it. Claiming something is verified without a measurement has been wrong twice, and both times they noticed before the check did.
- Commit with explicit paths, never `git add -A`, and write a message that says what is actually in the change.
- Copy lives in content files. Never rewrite copy while editing layout. If copy needs to change, say so and wait.
- If an instruction rests on a premise that turns out to be wrong, say so rather than complying. That has happened several times and was wanted every time: three of the four corpus dimensions were not coded fields, the report was not 1,708 pages, and the empty side of the page was the right one, not the left.
