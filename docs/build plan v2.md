# adaptivegovernance.info — build plan, version 2

Supersedes the sections of version 1 that dealt with the globe and with site structure. Parts 3, 4, 5, 6, 7, 9, 10 and 11 of version 1 (tooling, Next.js setup, skills, Playwright, motion pass, QA, deploy) still stand as written. Read this alongside it, not instead of it.

---

## Part A. The globe. Direct answer to the nano banana question.

**No. Do not generate the globe with an image model, and do not build it from a heightfield.**

Here is why, precisely.

An image model produces a picture. A picture has no idea where Qatar is. The moment you want a country to light up because your corpus holds fourteen studies from it, or a click on Qatar to open the Gulf findings, you need geometry with real coordinates behind every pixel. A generated image cannot give you that, and no amount of prompting will make it. You would end up hand placing invisible click targets over a picture of a planet, which breaks the instant anyone rotates it.

A heightfield is worse for this job. A heightfield displaces a surface by the brightness of a texture. Fed a generated image it invents terrain that does not exist, which on a globe means fictional continents. Fed real elevation data it gives you accurate mountains that are, at planetary zoom, roughly four pixels tall and completely invisible. Either way you spend a day and get nothing a viewer can see.

**What you actually build**

A sphere, plus country polygons drawn from real boundary data, plus your corpus joined onto those polygons by country code.

* Library: `react-globe.gl`, a React wrapper around `globe.gl`, which wraps Three.js. It gives you country polygons, per country fill and height, hover, click and a one line camera fly to.
* Boundary data: Natural Earth 110m countries, as GeoJSON. Public domain. Every country carries an ISO three letter code, and that code is your join key.
* The join: `{ QAT: 14, IDN: 9, UKR: 3, ... }` derived from your 272 record corpus. Feed it to `polygonAltitude` and `polygonCapColor`. Countries with more studies stand taller and read brighter.

That last line is the whole idea. The extrusion is your heightfield, and it is made of data rather than of an image.

**Where AI image generation is genuinely useful here**

* Abstract background fields behind text sections.
* The atmosphere glow and the star field, if you want something other than the defaults.
* Placeholder imagery for event cards until you have photographs.

Nothing positional. Nothing a user will click.

**Earth texture**

Three options, in order of how well they suit a research site.

1. **No photographic texture.** Dark sphere, faint graticule, country polygons in a single accent colour scaled by corpus count. This is the option I would take. It reads as an instrument rather than as a screensaver, it is lighter to load, it is far easier to make legible, and it will not date.
2. **NASA Blue Marble.** Public domain, accurate, photographic. Beautiful, heavy, and it fights your data layer for attention. If you use it, drop it to low opacity under the polygons.
3. **Stylised generated texture.** Only if you have a specific visual direction and accept that the continents will be decorative rather than accurate. On a governance research site, inaccurate continents under accurate data is a bad look.

---

## Part B. The choreography, tied to the proposal

The scroll sequence is not decoration if it follows the project's own argument. The proposal frames Qatar as sitting at a nexus of local, regional, transnational and global change. That is a layered claim, so build a layered globe.

**Stage one. Whole. Scroll progress 0.00 to 0.20**
Globe intact, slow rotation, countries raised by corpus count. Title and standfirst overlaid. Caption appears once: this globe shows where adaptive governance has been studied.

**Stage two. Dissection. 0.20 to 0.45**
Three concentric shells separate outward. Label each as it detaches:
* outer shell, global: frameworks and transnational agendas
* middle shell, regional: Gulf and Arab region
* inner shell, national and local: Qatar

Implementation: render three spheres at radii 1.00, 1.02, 1.04 and animate them to 1.00, 1.35, 1.70 while lowering opacity on the outer two. It reads as an exploded diagram. It is the single most convincing effect in the sequence and it is also the cheapest.

**Stage three. Descent. 0.45 to 0.70**
`pointOfView({ lat: 25.28, lng: 51.52, altitude: 0.35 }, duration)`. Qatar fills the frame. Outer shells fade out entirely. The corpus counts around the Gulf stay visible, and their thinness is the point: annotate it in one line rather than hiding it.

**Stage four. Breakout. 0.70 to 1.00**
Five nodes emerge around Doha, one per work package: digital policy labs, smart city platforms, foresight and narratives, crowdsourced sentiment, humanitarian diplomacy. Each is a hit target. Clicking one scrolls to that case section. This is the moment the hero stops being a hero and becomes navigation.

**Reduced motion path**
The whole sequence collapses to a single static render of stage four with the five nodes as ordinary links. Not a degraded experience, a different one. Build it deliberately.

**Mobile path**
Do not run the live scene on small screens. Serve a pre rendered image sequence of the four stages, or a single static stage four. A WebGL globe with three shells will drain a phone battery and stutter, and reviewers open links on phones.

---

## Part C. The corpus repository

This is the second load bearing piece of the site and it is far easier than the globe.

**Architecture: one JSON file, two views.**

No database. No backend. 272 records is nothing. A static JSON file shipped with the site, filtered in the browser, returns instantly and costs nothing to host.

**Record schema**

```
id            string, stable, e.g. "ag0147"
title         string
authors       array of strings
year          number
outlet        string, journal or publisher
doi           string, optional
url           string, the link the title opens
countries     array of ISO three letter codes, may be empty for conceptual work
region        string, e.g. Gulf, MENA, East Asia, Europe, Global
themes        array, mapped to your five work packages plus "conceptual"
method        string, e.g. case study, review, quantitative, mixed
status        "included" or "excluded"
note          string, your one line screening rationale
```

`countries` is what feeds the globe. `note` is what makes the repository worth visiting.

**On abstracts, and this matters**

You asked for names plus abstracts. Publisher abstracts are, in most cases, copyrighted by the publisher, and republishing 272 of them verbatim on a public site is a real exposure, not a theoretical one. Some are available under open terms through Crossref, most are not, and checking each one is not a good use of your time.

Do this instead, and it is better anyway: title, authors, year, outlet, a link that opens the source, and **your own two line summary and screening rationale**. That is original work, it carries no risk, and it shows a reviewer something a scraped abstract never could, which is that you read these papers and made a judgement about each one. The screening note is the asset. The abstract is a liability that also happens to be available one click away at the source.

If you do want abstracts, restrict them to records where the source is open access and the licence permits it, and mark the licence on each record.

**Pipeline**

1. Export your existing screening sheet to CSV.
2. Write one script that maps columns to the schema above, normalises country names to ISO codes, and emits `content/corpus.json`.
3. A second derived object, `content/corpus by country.json`, is just a count per ISO code. Generate it from the first file so the two can never drift apart.
4. Commit both. Regenerate when the corpus changes.

**Interface**

* Filter controls: country, region, year range, theme, method, inclusion status.
* Free text search across title, authors and note. Use Fuse.js if you want fuzzy matching, otherwise plain string matching is sufficient at this scale.
* Filters reflected in the URL so a filtered view can be linked and cited.
* Row click opens a detail panel, not a new page.
* One control that matters: a toggle for included against excluded. Publishing the exclusions with reasons is unusual and it is exactly the kind of thing a reviewer notices.

**The connection back to the globe**

Selecting a country on the globe applies a country filter to the repository and scrolls to it. Selecting a country in the repository highlights it on the globe. Same data, two directions. Wire this early, because it is the thing that makes the globe defensible rather than ornamental, and it is also the demo you will show people.

---

## Part D. Site structure

Single scrolling page for the narrative, separate routes for the two things people return to.

```
/                    hero globe, project, five cases, objectives, roadmap, outputs, events preview, team, contact
/corpus              the repository, filters, deep linkable
/corpus/[id]         individual record, for citation
/outputs             full list, filterable by type and work package
/events              upcoming and past
/events/[slug]       individual event
/team                full profiles, longer than the homepage summaries
```

**Content lives in files, not in components.** `content/*.md` for prose, `content/*.json` for corpus, outputs, events and team. This is what lets you or a research assistant update the site without touching code, and it is what stops an agent from rewriting your copy while editing layout.

---

## Part E. What does not go on the site

The proposal contains material that should not be published. Be explicit about this with anyone who helps you build it.

* The budget. All of it. Category totals, personnel costs, the spending forecast.
* The risk register. Publishing a list of ways your project might fail, next to the names of the ministries you depend on, serves nobody.
* Named hiring and procurement detail.
* Interview transcripts, raw case data, anything covered by IRB approval or by a data sharing agreement.
* Partner attributions beyond what the partners have agreed to. Confirm the wording in section nine of the copy file with each partner before publication, particularly the ministry roles.

---

## Part F. Two discrepancies to resolve before publication

1. **Dr. Anis Brik** appears as work package three lead in the roadmap table but not in the investigator table at the front of the proposal. The site currently lists him under the team with a work package three role. Confirm how he should be described.
2. **Case count.** The text says five case studies in some places and four cross cutting themes in others, and the deliverables section lists five cases while the objectives section names four domains. The site copy commits to five, matching the work packages. Confirm that is right.

Also confirm the project email address and whether the site should carry the Hamad Bin Khalifa University logo, which will have brand rules attached to it. Your `brand-guidelines` skill is the right place to hold those once you have them.

---

## Part G. Revised build order

| # | Step | Notes |
|---|---|---|
| 1 | Resolve Part F and confirm the copy with Dr. Tok | Nothing else should start first |
| 2 | Node, Git, Claude Code, `create-next-app` | Version 1, Parts 3 and 4 |
| 3 | Install one design skill, run `/impeccable init` | Feed it the copy file and the style rules at the end of it |
| 4 | Build the corpus pipeline, produce `corpus.json` | Before any interface work, because everything depends on the shape of this file |
| 5 | Build `/corpus` with filters, no styling | Prove the data works. This is the least glamorous step and the highest value |
| 6 | Build the static homepage, all sections, real copy, no motion, no globe | Version 1, Part 7 |
| 7 | Deploy to Vercel, attach adaptivegovernance.info | Do this now, not at the end |
| 8 | Globe prototype in `web-artifacts-builder`, throwaway | Get stages one to four working in a single HTML file before touching the repo |
| 9 | Port the globe in with `react-globe.gl`, bind to corpus data | |
| 10 | Scroll choreography with GSAP ScrollTrigger | Version 1, Part 8.3 |
| 11 | Wire globe and repository to each other | The step that makes the whole thing cohere |
| 12 | Motion pass on everything else | Version 1, Part 9 |
| 13 | Reduced motion path, mobile path, performance | Non negotiable before you send the link to anyone |
| 14 | Outputs and events content model, so updates need no developer | |

---

## Part H. Enforcing the no hyphen rule

An agent will reintroduce hyphens and em dashes constantly. It is one of the strongest habits in these models. Do not rely on asking.

Add a check that fails loudly. A script that scans `content/` for hyphen, en dash and em dash characters in prose, and for the banned phrase list at the end of the copy file, run before every commit. Your agent can write it in five minutes and it will save you from proofreading the same thing twenty times.

Put the rule in `DESIGN.md` as well, since that is what the design skill reads on every session. Stating it once in a prompt will not hold across a long build.
