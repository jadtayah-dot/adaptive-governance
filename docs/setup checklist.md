# adaptivegovernance.info — setup checklist, assets, and prompts

Companion to build plan version 2. Everything you need to download, everything you need to collect, and one prompt per step.

---

# Part 1. Can you do all of this in Claude Code?

Almost. Claude Code runs terminal commands, writes and edits files, starts your dev server, drives a real browser through the Playwright MCP, commits and pushes to GitHub, and can run the Vercel CLI. So the entire code side is one tool.

Six things it cannot do for you:

1. **Create accounts.** GitHub, Vercel. Browser, five minutes, once.
2. **Change DNS at your registrar.** Wherever you bought adaptivegovernance.info. Browser.
3. **Collect assets from humans.** Headshots, the HBKU logo pack, partner approval on how they are described.
4. **Export your corpus.** It comes out of your own screening pipeline. You produce the CSV.
5. **Make the design calls.** It will produce three options. Choosing is yours.
6. **Sign off the copy with Dr. Tok.** Including the two discrepancies in Part F of the build plan.

Everything else happens in one terminal window.

---

# Part 2. Applications to install

| What | Where | Why |
|---|---|---|
| Node.js, current LTS | nodejs.org | Runs everything. Get LTS, not Current |
| Git | git-scm.com | Version control. Your undo button |
| VS Code | code.visualstudio.com | To read what the agent writes. You will not type much in it |
| Claude Code | `npm install -g @anthropic-ai/claude-code` | The agent |
| Google Chrome | google.com/chrome | Playwright drives Chromium. Chrome also has the throttling tools you need in Part 13 |

That is the full list. Verify after installing:

```
node -v
npm -v
git --version
claude --version
```

**Accounts, no download**

* GitHub, free
* Vercel, free, sign in with GitHub
* Access to whichever registrar holds adaptivegovernance.info

**What you do not need**

* **Figma.** Requires a paid Dev or Full seat and exists to let agents read designs a designer already made. You have neither. Skip it.
* **Blender.** Only if you fall back to the pre rendered image sequence in Part 8.5 of version 1. Do not install it speculatively.
* **Tableau.** Separate deliverable, separate tool, not part of this site. The dashboard gets embedded or linked later.
* **Any hosting panel, cPanel, WordPress, or site builder.** Vercel replaces all of it.

---

# Part 3. Skills and MCP servers

**Already installed, and relevant**

| Skill | Use it for |
|---|---|
| `frontend-design` | Base design behaviour. The floor everyone else stands on |
| `ui-ux-pro-max` | Styles, palettes, stacks. This is your design brain for step 2, not theme factory |
| `research-intake` | Possible source for the corpus. See step 3 |
| `citation-audit` | Verifies every corpus record binds to a real reference before publication |
| `web-artifacts-builder` | Step 8, the throwaway globe prototype |
| `webapp-testing` | Written tests. Different job from the Playwright MCP |
| `algorithmic-art` | Optional. Background fields, if you want generated texture instead of flat colour |
| `skill-creator` | Later. Package your own site rules once you know what right looks like |

**Two skills to keep away from this project**

`brand-guidelines` applies Anthropic's own brand colours and typography. It is not a generic brand kit tool. Using it here will pull Anthropic's palette into an HBKU research site. HBKU brand rules go into `DESIGN.md` by hand instead.

`theme-factory` supplies ten preset themes for artifacts. Presets are how sites end up looking like other sites, which is the exact problem the design pack exists to solve. Use `ui-ux-pro-max` and the impeccable init interview to derive a system from this project rather than picking one off a shelf.

**To install**

```
npx impeccable install
```
then inside Claude Code, `/impeccable init`.

```
npx skills add https://github.com/delphi-ai/animate-skill --skill animate
```

Install one design pack, not two. If you prefer Taste Skill to Impeccable, install that instead:
```
npx skills add https://github.com/Leonxlnx/taste-skill --skill "high-end-visual-design"
```

**MCP server**

```
claude mcp add playwright npx @playwright/mcp@latest
```
Restart Claude Code afterwards. Verify with `/mcp`.

---

# Part 4. npm packages

Do not install these by hand. The prompts below install them at the point they are needed. Listed here so you know what is arriving and why.

**From `create-next-app`, automatic:** next, react, react-dom, typescript, tailwindcss, eslint

**Globe**
* `three` — the 3D engine
* `react-globe.gl` — the wrapper that gives you country polygons, hover, click and camera fly to
* `world-atlas` — country boundary data as TopoJSON, or fetch the GeoJSON directly
* `topojson-client` — converts TopoJSON to the GeoJSON that react-globe.gl expects

**Motion**
* `gsap` — ScrollTrigger, the scroll driver
* `lenis` — smooths native scroll
* `motion` — component level animation, formerly framer motion

**Corpus**
* `papaparse` — reads your CSV export
* `fuse.js` — fuzzy search across 272 records
* `i18n-iso-countries` — maps country names to ISO three letter codes reliably

**Nothing else.** If the agent proposes a state library, a component library, an animation library you did not ask for, or a headless CMS, say no. This site has 272 records and eleven sections.

---

# Part 5. Assets

## 5.1 Download yourself

**Country boundary data**
`countries-110m.json` from the `world-atlas` package, or Natural Earth 110m admin 0 countries as GeoJSON from naturalearthdata.com. Public domain. This is the single most important asset in the build.

One known trap: some Natural Earth builds set `ISO_A3` to `-99` for a handful of countries, France and Norway among them. Your join will silently drop them. The prompt in step 4 handles it, but check the output.

**Fonts**
Google Fonts or Fontshare, both free. You need two families, headings and body. Do not accept Inter, DM Sans, Poppins or Montserrat, which are the four defaults every agent reaches for and which will make the site look like every other site.

Reasonable directions for an academic project, in descending order of safety: a text serif such as Source Serif or Newsreader for headings with a neutral grotesque for body; or a single grotesque with real weight range such as Söhne, Suisse or their free equivalents Inter Tight is not one, use Public Sans or Geist. Let `theme-factory` propose and then judge with your eyes.

**Earth texture, only if you go photographic**
NASA Blue Marble from visibleearth.nasa.gov. Public domain. My recommendation in the build plan stands: do not. Flat dark sphere plus data driven polygons reads as an instrument.

## 5.2 Collect from people

This is the part that will delay you, so start it today, before you write a line of code.

**Headshots.** Seven investigators plus five partners, twelve images. Ask for square crops, 1000 by 1000 minimum, consistent background if possible. Inconsistent headshots are the fastest way to make a professional site look amateur, so if they arrive as a mess, tell the agent to convert all of them to a single treatment: same crop, same duotone or same desaturation. Uniform treatment beats mixed quality.

**HBKU brand pack.** Logo in SVG, approved colours, any rules about placement and clear space. From the College of Public Policy communications contact. If there is a rule about co branding with the Signature Research Grant programme, get that too. These go into `DESIGN.md` by hand. Do not reach for the `brand-guidelines` skill, which carries Anthropic's brand and not HBKU's.

**Partner approval.** Section nine of the copy file describes five external partners and their ministries. Send them their paragraph and get written confirmation before publication. Ministry attributions are not something to publish and then correct.

**Project email address.** A real one, monitored. Not a personal address.

## 5.3 Produce yourself

**`corpus.csv`.** Your export. Columns roughly: id, title, authors, year, outlet, doi, url, country, region, theme, method, status, note. The prompt in step 4 maps whatever you actually have onto the schema, so exact column names do not matter. What matters is that every included record has a country or is explicitly marked conceptual, because that is what feeds the globe.

**Screening notes.** One or two lines per record explaining the keep or the exclusion. If you do not already have these, this is the largest remaining piece of work on the site, and it is the piece that makes the repository worth visiting.

**Open Graph image.** 1200 by 630. A still frame of the globe at stage four works. Generate it once the globe exists.

---

# Part 6. Prompts

Paste these into Claude Code in order. Each assumes you are inside the project folder.

## Step 0. Set the rules before anything else

> Create a file called CLAUDE.md at the project root with the following as hard project rules, and read it at the start of every session.
>
> Rules:
> 1. No hyphens anywhere in user facing copy. Not in compounds, not as dashes, not as list bullets. No em dashes, no en dashes. Compounds are closed up or split into words: multiscalar, co taught, peer reviewed, data driven, real time, smart city.
> 2. No marketing register. Banned words and constructions: unlock, empower, leverage as a verb, seamless, cutting edge, robust, journey, ecosystem when it means people, at the intersection of, in today's rapidly changing world, more than ever, the construction we do not just X we Y, rhetorical questions as headings, three item lists used for rhythm rather than content, any sentence beginning with Whether you are.
> 3. All user facing prose lives in content files, never hardcoded in components. Never rewrite copy while editing layout. If copy needs to change, tell me and wait.
> 4. Do not install packages I have not approved. Propose first.
> 5. This site is read by grant reviewers and academics. Write as if a specialist is reading. State, do not sell.
>
> Then read the two files I am attaching, the site copy and the build plan, and summarise back to me in ten lines what you understand the project to be. Do not write any code yet.

Attach both markdown files with the prompt.

## Step 1. Scaffold

Run this yourself, not through the agent:

```
npx create-next-app@latest adaptive-governance
cd adaptive-governance
npm run dev
```

TypeScript yes, ESLint yes, Tailwind yes, App Router yes, Turbopack yes, import alias no.

Then start Claude Code in that folder.

## Step 2. Design system

> Run /impeccable init. When it asks about audience, brand lane, voice and anti references, use this: the audience is grant reviewers, academic peers and government partners in Qatar and the wider Gulf. The lane is institutional research, closer to a university research centre or a policy institute than to a product company. The voice is precise and unadorned. Anti references are startup landing pages, consultancy sites, and anything with a purple to blue gradient.
>
> Then use the ui-ux-pro-max skill to derive three type and colour systems for this project specifically. Do not use theme-factory and do not use a preset. Constraints: dark surface, because the globe sits on it. One accent colour only, and it must work as a data colour on country polygons at varying opacity. Reject Inter, DM Sans, Poppins and Montserrat. Show me all three as a single static page I can look at side by side before you commit anything to DESIGN.md.
>
> Do not use the brand-guidelines skill at any point on this project. It applies Anthropic brand rules and this is a Hamad Bin Khalifa University site.

## Step 3. Corpus pipeline

> I am attaching corpus.csv, my systematic review screening export. Write a Node script at scripts/build corpus.mjs that reads it and emits two files.
>
> If I have an existing evidence ledger from the research-intake skill covering these records, read that instead of the CSV and tell me which fields it already carries, so we do not rebuild something that exists.
>
> First, content/corpus.json, an array of records with this schema: id, title, authors as an array, year as a number, outlet, doi, url, countries as an array of ISO 3166 alpha 3 codes, region, themes as an array, method, status which is included or excluded, and note.
>
> Second, content/corpus by country.json, an object mapping ISO alpha 3 code to a count of included records. Derive it from the first file so the two can never disagree.
>
> Use i18n-iso-countries to resolve country names to codes. Anything that fails to resolve goes into a third file, content/corpus unresolved.json, with the original string, so I can fix it by hand rather than losing it silently. Records with no country are valid and get an empty array, they are conceptual work.
>
> Report back: total records, included count, excluded count, how many resolved to a country, how many are conceptual, how many failed to resolve, and the top ten countries by count. Do not build any interface yet.

## Step 4. The repository, unstyled

> Build the route /corpus. Read content/corpus.json. No styling beyond raw HTML and default Tailwind, I want to check the data works before it looks like anything.
>
> Requirements: a table of all records. Filter controls for country, region, year range, theme, method and inclusion status. Free text search across title, authors and note using fuse.js. All filter state reflected in the URL query string so a filtered view can be linked and cited. Clicking a row opens a detail panel, not a new page. A visible count of how many records match the current filters.
>
> All filtering happens client side. There is no backend and there will not be one.

## Step 5. Static homepage

> Build the homepage from the site copy file, all eleven sections, real copy exactly as written, using the DESIGN.md system. No animation. No 3D. No motion of any kind. Section five leaves a full viewport height empty block where the globe will go, with a placeholder.
>
> Copy goes in content files, not in components. Do not rewrite a single sentence of it. If something does not fit the layout, change the layout.
>
> When you are done, use playwright mcp to open localhost:3000, screenshot every section at 1440 wide and at 390 wide, and give me a list of what is visually wrong before I look at it myself.

## Step 6. Deploy now

> Initialise a git repository, commit everything, create a private GitHub repository called adaptive governance and push to it. Then tell me the exact steps to import it on Vercel and the exact DNS records I need to add at my registrar for adaptivegovernance.info, including the www subdomain.

## Step 7. Globe prototype, throwaway

> Using the web-artifacts-builder skill, build a single self contained HTML file. Not in this repo, as a standalone artifact.
>
> A Three.js globe, dark sphere, no photographic texture. Country polygons loaded from Natural Earth 110m, extruded and coloured by a value I supply per ISO alpha 3 code. I am attaching corpus by country.json. Countries with more records stand taller and read brighter. Hover shows country name and count. Click logs the country code.
>
> Four buttons that trigger the four stages: whole, dissect, descend, breakout.
> Whole: intact, slow rotation.
> Dissect: three concentric shells at radii 1.00, 1.02 and 1.04 separate outward to 1.00, 1.35 and 1.70, with the outer two dropping in opacity. Labels appear as each detaches: global, regional, national and local.
> Descend: camera flies to latitude 25.28, longitude 51.52, low altitude. Outer shells fade out.
> Breakout: five labelled nodes appear around Doha for the five work packages.
>
> I want to see whether this reads before we put it in the site. Iterate with me on how it looks. Do not touch the repo.

## Step 8. Port the globe

> Now bring the prototype into the site. Install three, react-globe.gl, world-atlas and topojson-client. Build components/Globe.tsx as a client component, dynamically imported with ssr false, rendering into the placeholder block in section five.
>
> It reads content/corpus by country.json for the country values. Country boundary data loads from the world-atlas package, converted with topojson-client. Check that France and Norway resolve, some Natural Earth builds set their ISO_A3 to minus 99 and they will silently vanish from the join.
>
> Static for now, stage one only, slow rotation, hover and click working. No scroll behaviour yet.

## Step 9. Scroll choreography

> Install gsap and lenis. Pin the globe section and drive the four stages from scroll progress with ScrollTrigger and scrub true.
>
> 0.00 to 0.20 stage one whole. 0.20 to 0.45 stage two dissection. 0.45 to 0.70 stage three descent to Qatar. 0.70 to 1.00 stage four breakout into the five work package nodes.
>
> Section labels and captions fade in and out with their stage. Transform and opacity only.
>
> After each change, use playwright mcp to open the page, scroll to 10, 30, 55, 80 and 95 percent of the pinned section, screenshot each, and describe what you see. I will tell you what is wrong from the screenshots.

## Step 10. Wire the globe to the repository

> Connect the two. Clicking a country on the globe navigates to /corpus with that country filter applied. Arriving at /corpus with a country filter in the URL highlights that country when the user scrolls back to the globe. Clicking a work package node in stage four scrolls to that case in section three.
>
> This is the step that makes the globe part of the site rather than an ornament on top of it, so be careful with it.

## Step 11. Motion pass

> Using the animate skill, add entrance motion to sections two through eleven. Transform and opacity only, never width, height, top or left. Nothing longer than 400ms. Ease out for entering elements. One easing language across the entire site.
>
> Then review your own work and give me a table of every animation you added, its duration, its easing, and why it is there. Cut anything you cannot justify in that last column.

## Step 12. Reduced motion, mobile, performance

> Three things, in this order.
>
> One. Implement prefers reduced motion. The globe sequence collapses to a single static render of stage four with the five nodes as ordinary links. Not a degraded version, a deliberate alternative. All other motion switches off.
>
> Two. Do not run the live WebGL scene below 768 pixels. Serve a static high quality render of stage four instead, with the five nodes still tappable. Reviewers open links on phones and three shells will stutter and drain battery.
>
> Three. Audit the bundle. Report the size of the three.js payload, the boundary data and the corpus JSON separately. Lazy load the globe. Target under three seconds to interactive on a throttled Fast 3G connection. Test it with playwright mcp under throttling and tell me the real number, not the ideal one.

## Step 13. Content model for the parts that keep changing

> Outputs and events need to be updatable by someone who does not write code. Move both to content/outputs.json and content/events.json with documented schemas, and write a short markdown file at content/README.md explaining exactly how to add an entry to each, written for a research assistant who has never used git.
>
> Build /outputs filterable by type and work package, /events split into upcoming and past, and /events/[slug] for individual events.

## Step 14. The hyphen guard

> Write scripts/check copy.mjs. It scans every file in content/ and fails with a non zero exit code if it finds a hyphen, an en dash or an em dash in prose, or any phrase from the banned list in CLAUDE.md. It prints the file, the line number and the offending text.
>
> Wire it into a pre commit hook so it runs before every commit. I do not want to proofread the same thing twenty times, and you will reintroduce these without meaning to.

---

# Part 7. The prompt you will use most

Not a step. Keep it to hand.

> Use playwright mcp. Open localhost:3000. [describe what to do.] Screenshot it. Tell me what is wrong before I look.

The last sentence is the important one. Asking the agent to criticise its own output before you see it produces a noticeably better second pass than asking it to fix what you point at.

---

# Part 8. Order of the things that block other things

Start these three now, in parallel with everything else, because they run on other people's time:

1. Request the headshots.
2. Request the HBKU brand pack.
3. Send section nine to the five external partners for approval.

And start the screening notes, because they are yours alone and they are the difference between a corpus page and a bibliography.
