# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary readers are grant reviewers assessing the project, academic peers in governance, public policy and Gulf studies, and government partners in Qatar and the wider Gulf region.

They arrive from a proposal, a citation, a conference programme or an email link. Most arrive once, with a specific question: what is this project, who is behind it, what evidence base does it rest on, and is the work credible. A reviewer is checking claims against evidence. A peer is looking for the corpus, the outputs and the method. A partner is checking how their institution is described.

Two return audiences matter more than their numbers suggest. Researchers come back to the corpus repository to search and cite it. Anyone following the project comes back to outputs and events.

Reviewers open links on phones. Mobile is a primary reading condition, not a fallback.

## Product Purpose

adaptivegovernance.info is the public site for Visualizing Adaptive and Transformative Governance, a two year research programme at the College of Public Policy, Hamad Bin Khalifa University, funded under the Signature Research Grant Program, third cycle, in the Global Transformation and Future of Governance signature area. July 2025 to July 2027. Project Lead Dr. Evren Tok.

Five case studies, seven investigators across four Hamad Bin Khalifa University entities, five external partners in government, in a United Nations regional commission and in the private sector.

The site does three things. It states what the project is, across eleven sections on a single scrolling homepage. It publishes the systematic review corpus as a searchable, filterable, citable repository. It carries the parts that keep changing: outputs, events and team.

Success is a reviewer or peer leaving able to say what the project studies, where it has been studied, and what the team has read, without having asked anyone.

## Positioning

The research question is where adaptation tips into transformation. Adaptive governance is the iterative fine tuning of policy under uncertainty. Transformative governance is a durable shift in authority, resources or rules. The project treats the boundary between the two as an empirical question rather than a theoretical one, coding each case for adaptive signals, meaning real time feedback loops and revision frequency, and for transformative markers, meaning new mandates, budget reallocation and new institutions. A third term, adaptive spaces, names the institutional room in which experimentation is permitted, recorded and fed back into decisions.

Qatar is the setting because it sits at a nexus of local, national, regional and transnational pressure, and because its institutions absorbed technological disruption, climate stress and shifting geopolitical alignment inside a compressed period. The claim is that Qatar also shapes governance discourse across scales rather than only illustrating it. That multiscalar claim is the argument, and the site is built to carry it rather than describe it.

Three things a neighbouring research site could not truthfully copy:

The corpus is published with screening notes, including the exclusions and the reason for each. Publishing what was rejected and why is unusual, and it is the evidence that the team read the literature and judged it, rather than assembled a bibliography.

The globe is joined to that corpus by country code. Countries stand taller and read brighter because the corpus holds more studies from them. The visual is a view of the data, not an illustration placed beside it.

The uneven distribution is itself a finding, and the copy states it: adaptive governance scholarship clusters in a small number of settings, and the Gulf is thin. Making that thinner region legible is part of what the project is doing. Nothing on the site may smooth this over.

**A record can carry more than one country, so country totals exceed the number of studies.** The copy carries a note in section five, labelled as sitting directly under the globe and marked not optional: studies covering more than one country are counted once for each, and country totals therefore exceed the number of studies. The globe never ships without it. A count on the globe that a reader could mistake for a count of studies is a factual error on a site read by reviewers.

## Operating Context

The homepage is a single scrolling narrative of eleven sections, fixed by the copy file: hero, what the project studies, the five cases, objectives, the corpus, roadmap, outputs, events, team, collaborate, footer. A twelfth section of the copy file, navigation and links, is not a narrative section: it holds the primary navigation labels, the four section level links, the footer columns and the skip link. The corpus, outputs, events and team live on their own routes because people return to them and link to them directly.

The five cases are digital policy labs, smart city platforms, strategic foresight and national narratives, crowdsourced sentiment, and humanitarian diplomacy. They map one to one onto the five work packages, and the five nodes in the final globe stage are these five. Each case carries named leads and, in three of the five, a named external partner.

Section ten is a contact form with five fields: name, organisation, email, which of three contact types applies, and message. The three types are researchers, government and institutional partners, and students. The copy supplies the confirmation message and a fallback pointing at the project email.

The copy also fixes the empty states for the corpus, for an unpublished output category, and for events. These are written copy, not placeholder text to be invented at build time.

Planned route structure:

    /                 homepage narrative, globe, five cases, objectives, roadmap, outputs preview, events preview, team, contact
    /corpus           the repository, filtered, deep linkable
    /corpus/[id]      individual record, for citation
    /outputs          filterable by type and work package
    /events           upcoming and past
    /events/[slug]    individual event
    /team             full profiles

The corpus is one static JSON file filtered in the browser. There is no backend and there will not be one. Filter state lives in the URL so a filtered view can be linked and cited.

The globe and the repository are wired to each other in both directions. Selecting a country on the globe applies that country filter to the repository. Arriving at the repository with a country filter highlights that country on the globe. That connection is what makes the globe part of the site rather than an ornament on it.

Content lives in files. Prose in markdown, corpus and outputs and events and team in JSON. A research assistant who does not write code must be able to add an event or an output without touching a component.

The site deploys to Vercel at adaptivegovernance.info, with DNS at Porkbun.

## Capabilities and Constraints

Stack in place: Next.js 16.3.2 with the App Router, React 19, TypeScript, Tailwind CSS v4, fuse.js for corpus search. Built so far: the corpus pipeline, the `/corpus` repository, the homepage with all eleven sections, and site wide navigation. The visual system is recorded in DESIGN.md.

Language: English only. No Arabic locale, no RTL layout, no second type family.

Corpus: the search returned 1,172 records. Screening reduced these to the 272 that met the inclusion criteria. Full text assessment against a strict definition of adaptive governance as a core concept narrowed that further, and **217 is the final tally analysed in the review**. The 217 are what the site publishes, and they carry their original identifiers from the numbered set rather than being renumbered, so the identifiers run to 274 with gaps.

The copy states 1,172 and 272 in section five and does not state 217. The funnel is therefore implied rather than stated, and section five needs a line that carries the final number. This is a copy change, so it waits on the user.

Schema is fixed: id, title, authors, year, outlet, doi, url, countries as ISO 3166 alpha 3 codes, region, themes, method, status of included or excluded, and note. A derived file maps country code to a count of included records, generated from the first file so the two cannot disagree. Records with no country are valid and are conceptual work.

The copy fixes the visible field and filter names. Filters are country, region, year, theme, method and inclusion status. The record detail shows title, authors, year, outlet, link, country of study, theme, method and screening note.

Geography is resolved by a hand written mapping at `content/country mapping.csv`, not by an automated name resolver, because only about thirty of the source values are bare country names and the rest are subnational, transboundary, multi country or prose. Every value carries a scale of national, subnational, transboundary, regional, global or conceptual. Of 217 records, 175 resolve to at least one country and 42 to none, across 66 distinct countries and 259 country mentions.

The copy check that scans `content/` reads markdown prose only and never JSON. Corpus titles, source values and method descriptions carry hyphens and dashes legitimately, and a check that read them would fail on the first record.

Publisher abstracts are not republished. Each record carries the team's own short summary and screening rationale plus a link to the source. Abstracts appear only where the source is open access and the licence permits, with the licence recorded on the record.

The globe is real geometry, not a picture. A sphere with country polygons from Natural Earth 110m boundary data, extruded and coloured by corpus count, joined on ISO alpha 3 code. No generated image and no heightfield, because neither knows where a country is and neither can be clicked. No photographic earth texture: a dark sphere with data driven polygons reads as an instrument.

The globe sequence has four scroll stages: whole, dissection into three concentric shells labelled global, regional, and national and local, descent to Qatar, and breakout into five nodes for the five work packages. Three stated performance and access constraints bind it. Below 768 pixels wide the live WebGL scene does not run, and a static render of the final stage is served with the five nodes still tappable. Under reduced motion the sequence collapses to a deliberate static alternative rather than a degraded one. Target is under three seconds to interactive on a throttled Fast 3G connection.

Approved package list, and nothing beyond it without asking: three, react-globe.gl, world-atlas, topojson-client, gsap, lenis, motion, papaparse, fuse.js, i18n-iso-countries.

The corpus licence is covered and is supplied on request. It is deliberately not published on the site. **The footer as written says "Corpus data is published under a stated licence", which the site no longer does.** That sentence is now inaccurate and needs a copy decision, which is why it sits in the undecided list rather than being edited.

Resolved, and settled in the copy:

* Five cases, not four themes. The copy commits to five and maps them onto the five work packages.
* The project email is flagship_horizon@hbku.edu.qa. It is in section ten of the copy and renders in the contact section.
* No Hamad Bin Khalifa University brand pack is required and the site does not carry the university logo. The institution is named in the copy, in the hero metadata line and the footer, and that is the extent of the identity.
* Dr. Anis Brik is not an investigator on this project and is not named anywhere on the site. He was removed from the investigator list in section nine, from the case three lead line in section three, and from Dr. Tok's entry, which now reads that Dr. Tok leads work package three. Case three is led by Dr. Evren Tok alone.
* The team count. Seven investigators named, seven stated in the section nine intro, across four Hamad Bin Khalifa University entities.

Undecided, and not to be invented:

* A line in section five of the copy stating the 217 figure, so the funnel from 1,172 to 272 to 217 is stated rather than implied. Section twelve now states 217 in the corpus link, so section five is the only place the number is still absent.
* The routes `/outputs`, `/events` and `/team`. Section twelve links to all three and none exists yet, so those three links return 404 until the routes are built.
* The footer line about the corpus licence. See below.

## Brand Commitments

Name: adaptivegovernance.info. Institution: Hamad Bin Khalifa University, College of Public Policy.

Voice is precise and unadorned. The site is read by grant reviewers and academics. State, do not sell.

The copy file carries its own style rules at the end, and those rules are the source of the copy rules already in CLAUDE.md rather than a restatement of them. The copy file is where they are authoritative:

* No hyphens. Not in compounds, not as dashes, not as bullets. Commas, colons and full stops instead. A compound that normally takes one is closed up or split: multiscalar, co taught, peer reviewed, data driven, smart city, real time.
* No em dashes and no en dashes.
* Numbers as digits above ten. Dates written out, so September 2025 rather than 09 2025.
* Titles as the person uses them: Dr., Ms., Mr., H.E.
* No sentence that could appear on a software company homepage, against a named banned list.
* Register: write as if a reviewer who knows the field is reading. If a sentence would survive in a methods section, it survives here.
* The test the copy sets: read a paragraph aloud, and if it sounds like it is trying to make you feel something, cut it.

The first two are enforced by a check that fails the commit, not by asking.

All user facing prose lives in content files, never hardcoded in components. Copy is never rewritten while editing layout. If copy needs to change, the change is raised and waits.

Anti references named by the user: startup landing pages, consultancy sites, and anything with a purple to blue gradient.

Type constraints already set: Inter, DM Sans, Poppins and Montserrat are rejected. The surface is dark, because the globe sits on it. One accent colour only, and it must hold up as a data colour on country polygons at varying opacity.

Two skills are barred from this project. The brand-guidelines skill carries Anthropic brand rules and this is an HBKU site. theme-factory supplies presets, and presets are how sites end up looking like other sites.

No Hamad Bin Khalifa University brand pack is needed. The project lead confirmed the site does not carry the university logo, so there is no co branding rule to satisfy and no identity dependency on the College of Public Policy communications contact. The institution appears as words in the copy only.

## Evidence on Hand

**The site copy is written and it is the single source of truth for every word on the site.** It lives at `docs/website content.md`, drafted from the third cycle Signature Research Grant research plan, with every claim traceable to the proposal.

All eleven sections are drafted: headings, standfirst, body prose, the three definitions, the five case descriptions with their leads, the four objectives, the corpus section, the roadmap with dates and status lines, the outputs list, the events strands, the full team and partner list, the collaborate section with its form fields and confirmation message, and the footer.

**Nothing on the site is written from scratch.** No session drafts a heading, a section, a case description, a team biography, a partner attribution, a label, an empty state or a confirmation message. Where the copy does not fit a layout, the layout changes. Where copy is genuinely missing, the gap is raised and the work waits.

Also present in the repository:

* `docs/build plan v2.md`, the technical and structural plan, covering the globe decision, corpus architecture, site structure, and what must not be published.
* `docs/runbook.md`, the ordered build sequence.
* `docs/checklist.md` and `docs/setup checklist.md`, byte identical duplicates covering assets, packages and prompts.

Not present, and not to be fabricated:

* corpus.csv, the screening export, and the per record screening notes. The notes are the asset that makes the repository worth visiting, and they are the largest remaining piece of work.
* Headshots for seven investigators and five external partners.
* Written partner approval of how the five external partners and their ministries are described. Ministry attributions are not published and then corrected.

Never published on this site, at the user's instruction: the budget in any form, the risk register, named hiring and procurement detail, interview transcripts or raw case data covered by IRB approval or a data sharing agreement, and any partner attribution beyond what that partner has approved in writing.

There are no testimonials, customers, benchmarks, pricing or user numbers. This is a funded university research project, and no session invents metrics for it.

## Product Principles

1. **The evidence is the product.** The corpus with its screening notes, including exclusions, is the thing a reviewer cannot get elsewhere. Everything else on the site points at it.
2. **Anything visual must be a view of real data.** The globe earns its place because it is joined to the corpus by country code and clicks through to it. A visual that cannot be traced back to a record does not ship.
3. **Say what is thin.** Where the corpus is sparse, the sparseness is annotated rather than hidden. The gap is part of the argument for the project.
4. **Content is editable without a developer.** Prose in markdown, structured records in JSON, with a written guide for a research assistant who has never used git.
5. **The copy is written and it is fixed.** Every word on the site comes from the copy file. Design serves it, never edits it, and never fills a gap by drafting. Precision is the register, and the copy rules come from the copy file and are enforced by a check rather than by good intentions.

## Accessibility & Inclusion

WCAG 2.1 AA is the required standard.

Consequences already known and binding: contrast ratios hold on the dark surface, including the accent colour used as a data colour at reduced opacity; focus is visible everywhere and is never trapped in the pinned scroll section; every interactive element including the country polygons and the five work package nodes is reachable by keyboard; and prefers reduced motion is a deliberate alternative path through the globe sequence, not a switched off version of it.
