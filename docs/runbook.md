# adaptivegovernance.info — runbook

Everything to type, in order, from nothing to live.

Three kinds of step:

**TERMINAL** — type into the integrated terminal in the Code tab
**CLAUDE** — paste into the Claude Code chat
**YOU** — a browser, an email, or a decision. No tool does it for you.

Gates are marked. Do not pass one until it is satisfied.

---

# Phase 0. Before any code

## 0.1 YOU — send the three requests

Three emails today. These run on other people's time and are the most likely reason the site is late.

* Headshots. Seven investigators, five external partners. Square crop, 1000 by 1000 minimum.
* HBKU brand pack from the College of Public Policy communications contact. Logo as SVG, approved colours, placement rules, and any co branding rule for the Signature Research Grant programme.
* Section nine of the copy file to the five external partners, for written approval of how they and their ministries are described.

## 0.2 YOU — resolve two things with Dr. Tok

* Is Dr. Anis Brik described as a work package three lead? He leads it in the roadmap table and is absent from the investigator table.
* Five cases or four themes? The copy commits to five.

Also get the project email address. A real monitored one.

## 0.3 YOU — check the DNS login

Confirm you can log into Porkbun and reach the DNS panel for adaptivegovernance.info. Check at the same time whether an MX or email forwarding record exists, since it is not visible in the record list you sent.

**GATE.** Phases 1 to 4 can proceed while 0.1 and 0.2 are outstanding. Phase 5 cannot.

---

# Phase 1. Scaffold

## 1.1 TERMINAL

```
cd "$env:USERPROFILE\Desktop\Claude Code"
```

```
npx create-next-app@latest adaptive-governance
```

Answers: TypeScript yes, ESLint yes, Tailwind yes, App Router yes, Turbopack yes, import alias no.

```
cd adaptive-governance
```

```
npm run dev
```

## 1.2 YOU

Open http://localhost:3000. It should show the Next.js starter page. It is ugly. That is correct.

Leave this terminal running for the rest of the build. Open a second terminal tab for everything below.

## 1.3 YOU — put the documents in place

Create these folders inside `adaptive-governance` and copy the three markdown files in:

```
docs/website content.md
docs/build plan v2.md
docs/setup checklist and prompts.md
```

Keep the grant proposal out of this folder entirely.

## 1.4 TERMINAL — install the two missing skills

```
npx impeccable install
```

```
npx skills add https://github.com/delphi-ai/animate-skill --skill animate
```

---

# Phase 2. Rules and understanding

## 2.1 CLAUDE

> Create a file called CLAUDE.md at the project root containing the following as hard project rules, and read it at the start of every session.
>
> 1. No hyphens anywhere in user facing copy. Not in compounds, not as dashes, not as list bullets. No em dashes, no en dashes. Compounds are closed up or split: multiscalar, co taught, peer reviewed, data driven, real time, smart city.
> 2. No marketing register. Banned: unlock, empower, leverage as a verb, seamless, cutting edge, robust, journey, ecosystem when it means people, at the intersection of, in today's rapidly changing world, more than ever, the construction we do not just X we Y, rhetorical questions as headings, three item lists used for rhythm rather than content, any sentence beginning with Whether you are.
> 3. All user facing prose lives in content files, never hardcoded in components. Never rewrite copy while editing layout. If copy needs to change, tell me and wait.
> 4. Do not install packages I have not approved. Propose first.
> 5. Never use the brand-guidelines skill on this project. It carries Anthropic brand rules and this is a Hamad Bin Khalifa University site.
> 6. Never use theme-factory on this project. No presets.
> 7. This site is read by grant reviewers and academics. State, do not sell.
>
> Then read docs/website content.md and docs/build plan v2.md and summarise back to me in ten lines what you understand this project to be. Do not write any code yet.

## 2.2 YOU

Read the summary. If it has misunderstood the project, correct it now. Everything downstream inherits this.

---

# Phase 3. Design system

## 3.1 CLAUDE

> Run /impeccable init.

Answer the interview with:

* Audience: grant reviewers, academic peers, and government partners in Qatar and the wider Gulf.
* Lane: institutional research. Closer to a university research centre or a policy institute than to a product company.
* Voice: precise and unadorned.
* Anti references: startup landing pages, consultancy sites, anything with a purple to blue gradient.

## 3.2 CLAUDE

> Use the ui-ux-pro-max skill to derive three type and colour systems for this project specifically. Not presets, and do not use theme-factory.
>
> Constraints: dark surface, because a globe sits on it. One accent colour only, and it must work as a data colour on country polygons at varying opacity. Reject Inter, DM Sans, Poppins and Montserrat.
>
> Show me all three as a single static page I can look at side by side. Commit nothing to DESIGN.md until I choose.

## 3.3 YOU

Look at all three. Choose one. This is a judgement call and it is yours.

## 3.4 CLAUDE

> Option [N]. Write it into DESIGN.md as CSS custom properties: colours, type scale, spacing scale. Every later component uses only these variables, never a raw value.

---

# Phase 4. The corpus

This is the part everything else depends on.

## 4.1 YOU

Put your screening export at `content/corpus.csv`. Column names do not matter, the script maps them.

If you have a `research-intake` evidence ledger covering these records, say so in the next prompt rather than exporting a spreadsheet.

## 4.2 CLAUDE

> Read content/corpus.csv, my systematic review screening export. If I have an existing research-intake evidence ledger covering these records, read that instead and tell me which fields it already carries before building anything.
>
> Write a Node script at scripts/build corpus.mjs that emits two files.
>
> content/corpus.json, an array with this schema: id, title, authors as an array, year as a number, outlet, doi, url, countries as an array of ISO 3166 alpha 3 codes, region, themes as an array, method, status which is included or excluded, note.
>
> content/corpus by country.json, an object mapping ISO alpha 3 code to a count of included records. Derive it from the first file so the two cannot disagree.
>
> Use i18n-iso-countries to resolve names to codes. Anything that fails goes to content/corpus unresolved.json with the original string, so I can fix it by hand rather than lose it silently. Records with no country are valid and get an empty array, they are conceptual work.
>
> Report: total, included, excluded, resolved to a country, conceptual, failed. Plus the top ten countries by count. No interface yet.

## 4.3 YOU

Check `content/corpus unresolved.json`. Fix the country strings that failed. Rerun.

**GATE.** Do not proceed until the top ten country counts look right to you. Everything visual downstream reads this file.

## 4.4 CLAUDE

> Build the route /corpus. Read content/corpus.json. No styling beyond raw HTML and default Tailwind. I want to check the data before it looks like anything.
>
> A table of all records. Filters for country, region, year range, theme, method and inclusion status. Free text search across title, authors and note using fuse.js. All filter state in the URL query string so a filtered view can be linked and cited. Clicking a row opens a detail panel, not a new page. A visible count of matching records.
>
> All filtering client side. There is no backend and there will not be one.

## 4.5 CLAUDE

> Use the citation-audit skill across content/corpus.json. Every record with a DOI or URL must resolve to a real reference. Report anything broken, duplicated, or missing an identifier.

---

# Phase 5. The homepage

**GATE.** Requires 0.2 resolved and the copy approved by Dr. Tok.

## 5.1 CLAUDE

> Build the homepage from docs/website content.md. All eleven sections, real copy exactly as written, using the DESIGN.md system. No animation, no 3D, no motion of any kind. Section five leaves a full viewport height empty block where the globe will go.
>
> Copy goes in content files, not in components. Do not rewrite a single sentence. If something does not fit the layout, change the layout.

## 5.2 CLAUDE

> Use the webapp-testing skill. The site is on localhost:3000. Write and run a Playwright test that loads the homepage, asserts every section from the copy file is present, captures full page screenshots at 1440 and at 390 wide, and reports anything that overflows or overlaps. Then tell me what looks wrong before I look.

## 5.3 YOU

Look at it. Say what is wrong in plain language. You do not need design vocabulary, the skill supplies that. Iterate until you like it.

---

# Phase 6. Deploy early

Do this now, not at the end. A live URL that improves weekly is worth more than a perfect one that appears in month three.

## 6.1 CLAUDE

> Initialise a git repository, commit everything, and push to a new private GitHub repository called adaptive governance.

## 6.2 YOU

vercel.com, sign in with GitHub, Import Project, select the repo. It builds and gives you a `.vercel.app` URL.

Confirm that URL works before touching DNS.

## 6.3 YOU

In Vercel: Project, Settings, Domains, add `adaptivegovernance.info`. It displays the exact records it wants.

In Porkbun: delete the ALIAS to pixie.porkbun.com and delete the wildcard CNAME. Both must go, the wildcard catches www regardless of what else you add. Then add what Vercel showed you. If Vercel offers a hostname for the apex rather than an IP, use ALIAS with that hostname.

Leave TTL at 600. Certificates are automatic. Invalid configuration for the first few minutes is propagation, not an error. Give it an hour.

---

# Phase 7. The globe

## 7.1 CLAUDE

> Using the web-artifacts-builder skill, build a single self contained HTML file as a standalone artifact, not in this repo.
>
> A Three.js globe. Dark sphere, no photographic texture. Country polygons from Natural Earth 110m, extruded and coloured by a value per ISO alpha 3 code. I am attaching content/corpus by country.json. More records means taller and brighter. Hover shows country name and count. Click logs the country code.
>
> Four buttons for four stages.
> Whole: intact, slow rotation.
> Dissect: three concentric shells at radii 1.00, 1.02 and 1.04 separate outward to 1.00, 1.35 and 1.70, outer two dropping in opacity, labels appearing as each detaches: global, regional, national and local.
> Descend: camera flies to latitude 25.28, longitude 51.52, low altitude, outer shells fade out.
> Breakout: five labelled nodes around Doha for the five work packages.
>
> Iterate with me on how it looks. Do not touch the repo.

## 7.2 YOU

**GATE.** Does this read as a research instrument or as a screensaver? If it is the second, keep iterating here where it is cheap. Do not port a globe you are not convinced by.

## 7.3 CLAUDE

> Bring the prototype into the site. Install three, react-globe.gl, world-atlas and topojson-client. Build components/Globe.tsx as a client component, dynamically imported with ssr false, rendering into the placeholder in section five.
>
> It reads content/corpus by country.json. Boundary data from the world-atlas package, converted with topojson-client. Check that France and Norway resolve, some Natural Earth builds set their ISO_A3 to minus 99 and they will silently vanish from the join.
>
> Stage one only. Slow rotation, hover and click working. No scroll behaviour yet.

---

# Phase 8. Scroll choreography

## 8.1 YOU — add the Playwright connector

This is the one step where the conversational browser loop beats written tests, because there is no assertion for "the layer separation feels abrupt at 45 percent."

Try the + button next to the prompt box, then Connectors. If Playwright is not offered there, create `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

Then start a new session. Approve the server when prompted, and run `/mcp` to confirm it shows connected.

## 8.2 CLAUDE

> Install gsap and lenis. Pin the globe section and drive the four stages from scroll progress with ScrollTrigger and scrub true.
>
> 0.00 to 0.20 whole. 0.20 to 0.45 dissection. 0.45 to 0.70 descent to Qatar. 0.70 to 1.00 breakout into the five work package nodes. Section labels and captions fade with their stage. Transform and opacity only.

## 8.3 CLAUDE — repeat after every change

> Use playwright mcp. Open localhost:3000. Scroll the pinned globe section to 10, 30, 55, 80 and 95 percent. Screenshot each. Tell me what looks wrong before I look.

## 8.4 CLAUDE

> Connect the globe and the repository. Clicking a country on the globe navigates to /corpus with that country filter applied. Arriving at /corpus with a country filter highlights that country when the user scrolls back to the globe. Clicking a work package node in stage four scrolls to that case in section three.
>
> This is what makes the globe part of the site rather than an ornament on it. Be careful with it.

---

# Phase 9. Motion, then everything that stops it breaking

## 9.1 CLAUDE

> Using the animate skill, add entrance motion to sections two through eleven. Transform and opacity only, never width, height, top or left. Nothing longer than 400ms. Ease out for entering elements. One easing language across the entire site.
>
> Then give me a table of every animation you added, its duration, its easing, and why it is there. Cut anything you cannot justify in that last column.

## 9.2 CLAUDE

> Implement prefers reduced motion. The globe sequence collapses to a single static render of stage four with the five nodes as ordinary links. Not a degraded version, a deliberate alternative. All other motion switches off.

## 9.3 CLAUDE

> Do not run the live WebGL scene below 768 pixels wide. Serve a static high quality render of stage four instead, with the five nodes still tappable.

## 9.4 CLAUDE

> Audit the bundle. Report the size of the three.js payload, the boundary data and the corpus JSON separately. Lazy load the globe below the fold. Then use playwright mcp under Fast 3G throttling and tell me the real time to interactive, not the ideal one. Target is under three seconds.

## 9.5 CLAUDE

> Tab through the entire page with the keyboard. Confirm focus never gets trapped in the pinned scroll section, all interactive elements are reachable, and focus is visible. Fix what is not.

---

# Phase 10. The parts that keep changing

## 10.1 CLAUDE

> Move outputs and events to content/outputs.json and content/events.json with documented schemas. Write content/README.md explaining exactly how to add an entry to each, written for a research assistant who has never used git.
>
> Build /outputs filterable by type and work package, /events split into upcoming and past, and /events/[slug] for individual events.

## 10.2 CLAUDE

> Add the team headshots from public/images/team. If they arrive at inconsistent quality, apply one uniform treatment to all twelve: same crop, same desaturation or duotone. Uniform treatment beats mixed quality.

## 10.3 CLAUDE

> Write scripts/check copy.mjs. It scans every file in content/ and fails with a non zero exit code on any hyphen, en dash or em dash in prose, or any phrase from the banned list in CLAUDE.md. It prints file, line number and offending text. Wire it into a pre commit hook.

## 10.4 CLAUDE

> Generate an Open Graph image at 1200 by 630 from a still frame of the globe at stage four. Add it plus page titles and descriptions for every route. Add a favicon from the HBKU mark in public/brand.

---

# Phase 11. Before you send the link

## 11.1 CLAUDE

> Run the full webapp-testing suite. Then use playwright mcp to open the production URL, not localhost, and check: every route loads, the corpus filters work, deep linked filter URLs restore state, all headshots load, the contact form validates and submits, and nothing 404s. Report everything.

## 11.2 YOU

Open the live site on your phone. On a normal connection, not office wifi. Reviewers do this.

## 11.3 YOU

Final read of every word on the site against the style rules at the end of the copy file. The lint catches hyphens. It does not catch a sentence that has started trying to sell something.

---

# The prompt you will use most

Keep this to hand. It is not a step.

> Use playwright mcp. Open localhost:3000. [what to do.] Screenshot it. Tell me what is wrong before I look.

That last sentence produces a noticeably better second pass than asking the agent to fix what you point at.

---

# If something breaks

Commit whenever you like the state:

```
git add -A
git commit -m "what changed"
```

When the agent breaks something badly:

```
git checkout .
```

That returns you to the last commit. It is the only undo that actually works, and it is the reason to commit more often than feels necessary.
