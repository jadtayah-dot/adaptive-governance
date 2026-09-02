import { readFileSync } from 'node:fs'
import path from 'node:path'

import CorpusYearsFigure, { type YearCount } from '@/components/CorpusYearsFigure'
import GlobeStage from '@/components/GlobeStage'
import InstitutionLogos from '@/components/InstitutionLogos'
import ReviewFunnel from '@/components/ReviewFunnel'
import { STILL_FRAMES, stillSize, type StillFrame } from '@/lib/globe-sequence'
import globe from '@/content/globe.json'
import home from '@/content/home.json'

// Every string on this page comes from content/home.json, which is a verbatim
// transcription of docs/website content.md. No copy is written here.

/*
  Sections span the viewport. The measure is capped on the runs of prose that
  need it, with PROSE, and not on the container: capping the container put the
  whole site, grids, globe and all, into a column down the middle of a wide
  screen, which is a reading measure applied to things that are not reading.
*/
const SECTION = 'w-full px-6 py-20 md:px-10 md:py-32 2xl:px-16'
const PROSE = 'max-w-[68ch]'
const H2 = 'text-[2rem] leading-tight font-semibold tracking-tight'
// No text-transform here. Uppercasing would alter the copy as displayed, and the
// hero metadata line and the team labels carry names and titles.
const LABEL = 'font-mono text-[0.8rem] tracking-wide text-ink-muted'

/**
 * Initials for a person with no headshot. Honorifics are dropped, then the
 * first letter of the given name and of the last name part, so "H.E. Dr.
 * Abdulaziz Al Horr" gives AH rather than HD.
 */
const HONORIFICS = new Set(['dr', 'mr', 'ms', 'mrs', 'prof', 'he', 'h.e', 'eng'])

function initials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/\.$/, ''))
    .filter((part) => part && !HONORIFICS.has(part.toLowerCase().replace(/\./g, '')))
  if (parts.length === 0) return ''
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Splits a middot separated line from the copy into its parts. Adds no words. */
function parts(line: string) {
  return line.split('·').map((s) => s.trim()).filter(Boolean)
}

/** A section level link. Label and detail both come from the copy file. */
function SectionLink({
  href,
  label,
  detail,
}: {
  href: string
  label: string
  detail?: string
}) {
  return (
    <p className="mt-8 max-w-[68ch] leading-relaxed">
      <a href={href} className="text-accent underline underline-offset-4">
        {label}
      </a>
      {detail ? <span className="text-ink-muted"> {detail}</span> : null}
    </p>
  )
}

/*
  The corpus by year, counted here rather than in the browser.

  content/corpus.json is nearly half a megabyte across twenty nine fields and
  has no business being downloaded for a chart of seventeen numbers, so it is
  read at build time and only the counts are handed on. Read rather than
  imported, so TypeScript does not have to infer a literal type for 217 records.

  Years run continuously from the earliest in the corpus to the latest, so a
  year the corpus does not reach is drawn empty rather than closed up.
*/
function yearCounts(): YearCount[] {
  const file = path.join(process.cwd(), 'content', 'corpus.json')
  const records = JSON.parse(readFileSync(file, 'utf8')) as { year: number | null }[]
  const counts = new Map<number, number>()
  for (const record of records) {
    if (record.year === null) continue
    counts.set(record.year, (counts.get(record.year) ?? 0) + 1)
  }
  const known = [...counts.keys()]
  const from = Math.min(...known)
  const to = Math.max(...known)
  return Array.from({ length: to - from + 1 }, (_, i) => ({
    year: String(from + i),
    count: counts.get(from + i) ?? 0,
  }))
}

export default function Home() {
  const years = yearCounts()

  return (
    <div className="bg-surface text-ink">
      <Hero />
      <Studies />
      <Cases />
      <Objectives />
      <CorpusOpening years={years} />
      <GlobeFrames />
      {/*
        The argument. One globe, pinned, with nothing over it but the sequence
        naming itself. It sits inside section five, where the copy puts the
        globe, so the eleven sections keep their order and the globe note stays
        directly under the well the pin releases into.

        The prose is above and below rather than scrolling past the sphere. A
        globe with a column of paragraphs beside it that never refer to it reads
        as decoration, which is what this was.
      */}
      <GlobeStage>
        <GlobeRunway />
        <GlobeWell />
        <GlobeHold />
      </GlobeStage>
      <CorpusEvidence />
      <Roadmap />
      <Outputs />
      <Events />
      <Team />
      <Collaborate />
      <Footer />
    </div>
  )
}

function Hero() {
  const c = home.hero
  return (
    <section id="hero" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h1 className="max-w-[20ch] text-[2.25rem] leading-[1.1] font-semibold tracking-tight md:text-[3rem]">
        {c.title}
      </h1>
      <p className="mt-6 max-w-[46ch] text-[1.25rem] leading-snug text-accent">{c.subtitle}</p>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.standfirst}</p>
      <p className={`mt-10 ${LABEL} not-italic leading-relaxed`}>{c.metadata}</p>
    </section>
  )
}

function Studies() {
  const c = home.studies
  return (
    <section id="studies" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={`${H2} max-w-[24ch]`}>{c.heading}</h2>
      <div className={`mt-10 space-y-6 ${PROSE}`}>
        {c.body.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </div>
      <dl className="mt-16 grid border-t border-l border-rule md:grid-cols-3">
        {c.definitions.map((d) => (
          <div key={d.term} className="border-r border-b border-rule bg-surface-raised p-6">
            <dt className="text-[1.25rem] font-semibold text-accent">{d.term}</dt>
            <dd className="mt-3 text-[0.9rem] leading-relaxed text-ink-muted">{d.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Cases() {
  const c = home.cases
  return (
    <section id="cases" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.intro}</p>
      <ol className="mt-16 border-t border-rule">
        {c.items.map((item) => (
          <li
            key={item.label}
            id={`case-${item.label.split(' ')[1]}`}
            className="grid gap-4 border-b border-rule py-8 md:grid-cols-[8rem_1fr] md:gap-10"
          >
            <p className={LABEL}>{item.label}</p>
            <div className={PROSE}>
              <h3 className="text-[1.6rem] leading-tight font-semibold">{item.title}</h3>
              <p className="mt-4">{item.description}</p>
              <p className="mt-4 text-[0.9rem] text-ink-muted">{item.leads}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Objectives() {
  const c = home.objectives
  return (
    <section id="objectives" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <div className="mt-16 grid border-t border-l border-rule md:grid-cols-2">
        {c.items.map((o) => (
          <div key={o.heading} className="border-r border-b border-rule bg-surface-raised p-6 md:p-8">
            <h3 className="text-[1.25rem] leading-snug font-semibold text-accent">{o.heading}</h3>
            <p className="mt-4 leading-relaxed text-ink-muted">{o.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/*
  Section five is split across the end of the pinned container. The heading and
  the body are the last prose the globe passes behind; the well is the last
  thing inside the container; and everything from the globe note down is outside
  it. The split is what lets the pin release exactly at the bottom of the well
  and keeps the note directly under the globe, which PRODUCT.md marks as not
  optional. The id stays on the opening so the section anchor is unchanged.
*/
function CorpusOpening({ years }: { years: YearCount[] }) {
  const c = home.corpus
  return (
    <section id="corpus" data-above-globe
      className={`${SECTION} pb-0 md:pb-0`}>
      <h2 className={H2}>{c.heading}</h2>
      {/*
        Prose left, figures right, once there is room for both.

        The measure is capped at 68 characters because that is a reading
        measure, so on a wide screen the prose used a third of the width and
        the rest was empty: measured at 1920, the text ended at 675 and 65
        percent of the line was nothing. The answer is not a wider measure, it
        is something to put beside it.

        Both figures are readings of the same corpus the section is about. The
        funnel is the three numbers the first paragraph states, as a shape. The
        years are when this literature was written. Nothing here is decoration:
        a visual that cannot be traced to a record does not ship.
      */}
      <div className="mt-10 grid gap-x-16 gap-y-12 xl:grid-cols-[minmax(0,68ch)_minmax(0,1fr)]">
        <div className="space-y-6">
          {c.body.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </div>
        {/*
          A flex gap rather than space-y. The figures carry m-0 to kill the
          browser default margin on figure, and that also cancelled the margin
          space-y puts on the following sibling, so the two sat on top of each
          other. A gap is not a margin and cannot be overridden by one.
        */}
        <div className="flex max-w-[34rem] flex-col gap-14 xl:pt-1">
          <ReviewFunnel />
          <CorpusYearsFigure years={years} />
        </div>
      </div>
      {/*
        The last line before the globe itself, and it names what the globe is.
        It was in the hero, four sections above the thing it describes. True on
        both paths: it does not promise a scroll driven globe, because below
        MIN_LIVE_WIDTH there is not one.
      */}
      <p className="mt-10 max-w-[46ch] text-[0.9rem] text-ink-muted">{c.globeLine}</p>
    </section>
  )
}

/*
  The argument, without scroll.

  Three frames in document order, each with the copy that arrives over the globe
  at that moment on the live path. This is what a reader below MIN_LIVE_WIDTH
  gets, and what a reader who has asked for reduced motion gets at any width.

  It used to be a table of the three layer names and one still of the end state.
  That is not a quieter version of the argument: the move it is built on, the
  globe coming apart and then being descended into, was absent, so a reader was
  told what the layers were and never shown them.

  The pictures come out of the running scene, at the positions in STILL_FRAMES,
  by `scripts/globe still.py`. Nothing here is drawn by hand and the build fails
  if the corpus moves on without them.
*/
function GlobeFrames() {
  const c = globe
  return (
    <div data-globe-static className="w-full px-6 pt-16 md:px-10 2xl:px-16">
      <ol className="space-y-16">
        <li>
          <GlobeFrame id="whole" alt={c.stillAlt.whole} />
          <p className={`mt-6 border-l-2 border-l-accent pl-4 leading-relaxed ${PROSE}`}>
            {c.openingNote}
          </p>
        </li>

        <li>
          <GlobeFrame id="separated" alt={c.stillAlt.separated} />
          {/* The three layers the frame above has just pulled apart. */}
          <dl className="mt-6 grid border-t border-l border-rule sm:grid-cols-3">
            {c.shells.map((shell) => (
              <div key={shell.id} className="border-r border-b border-rule bg-surface-raised p-6">
                <dt className="font-mono text-[0.9rem] text-accent">{shell.label}</dt>
                <dd className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">{shell.gloss}</dd>
              </div>
            ))}
          </dl>
        </li>

        <li>
          <GlobeFrame id="descended" alt={c.stillAlt.descended} />
          <p className={`mt-6 border-l-2 border-l-accent pl-4 leading-relaxed ${PROSE}`}>
            {c.descentNote}
          </p>
          {/* The second colour, marking evidence this project is creating. */}
          <p className={`mt-4 border-l-2 border-l-globe-project pl-4 leading-relaxed ${PROSE}`}>
            {c.nodesNote}
          </p>
        </li>
      </ol>
    </div>
  )
}

/*
  One frame. Square, because the renderer crops square around the camera target,
  and bordered, because a square picture of a sphere on a page needs an edge to
  read as a figure rather than as a stray graphic.

  Served as a plain img with explicit dimensions rather than through next/image,
  which is the rule the portraits already follow: at this size the optimizer
  buys nothing and its lazy loading did not resolve reliably.
*/
function GlobeFrame({ id, alt }: { id: StillFrame; alt: string }) {
  const frame = STILL_FRAMES.find((f) => f.id === id)!
  const size = stillSize(frame.crop)
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/globe-still-${id}.png`}
      alt={alt}
      width={size.width}
      height={size.height}
      className="block w-full border border-rule bg-surface"
    />
  )
}

/*
  The scroll the argument runs on.

  The pinned globe needs a distance to be scrolled through and it no longer
  borrows one from the prose, so it has its own: four viewport heights, one for
  each span of the sequence. Empty by design. Below MIN_LIVE_WIDTH nothing is
  pinned and this would be four screens of nothing, so it is not there at all.
*/
/*
  A viewport height after the sequence ends and before anything else appears.

  The globe becomes interactive at the handover, which fires when the sequence
  reaches its end, and its strength falls as soon as the section below starts to
  show. Without this those two are eighty pixels apart: measured, the globe was
  both live and visible across about sixty pixels of scrolling, which is why it
  read as not interactive at all. This is the room to use it. It holds nothing,
  so nothing is behind the globe while the reader turns it.
*/
function GlobeHold() {
  return <div aria-hidden="true" data-globe-live className="h-screen w-full" />
}

function GlobeRunway() {
  return <div aria-hidden="true" data-globe-live className="h-[400vh] w-full" />
}

/*
  Where the globe comes to rest, and what stands in for it below
  MIN_LIVE_WIDTH.

  On the live path the box is empty by design: the globe is mounted once, in the
  pinned layer behind the page, and the sticky layer stops flush with this frame
  at the end of the container. No background, or it would paint over the globe
  it is meant to frame.

  Below that width the frame holds a still of the last stage of the argument.
  The file is rendered from the running scene by `scripts/globe still.py`, not
  drawn by hand, so it cannot drift from the corpus. Regenerate it whenever the
  corpus or the globe changes.

  The canvas still takes no focus on the live path: the same counts are readable
  in the corpus table linked directly below. That is a holding position, not a
  decision, and it needs revisiting before launch.
*/
function GlobeWell() {
  return (
    <div data-globe-live className="w-full px-6 pt-16 md:px-10 2xl:px-16">
      {/*
        The box the pinned layer comes to rest in. It carries no picture any
        more: the static path is three frames of its own, further up the page,
        and this is only the shape the live scene settles into.
      */}
      <div id="globe" data-testid="globe-placeholder" className="h-screen w-full" />
    </div>
  )
}

function CorpusEvidence() {
  const c = home.corpus
  return (
    <div data-above-globe
      className={`${SECTION} border-b border-rule pt-0 md:pt-0`}>
      <p className="mt-6 max-w-[68ch] text-[0.9rem] leading-relaxed text-ink-muted">
        {c.globeNote}
      </p>

      <SectionLink
        href={home.nav.corpusLink.href}
        label={home.nav.corpusLink.label}
        detail={home.nav.corpusLink.detail}
      />

      {/*
        `corpus.filterLabels` and `corpus.recordDetailFields` are not rendered.
        They are the field lists the corpus table and the record page are built
        from, which is a specification for a component rather than prose for a
        reader, and they were being printed as two paragraphs of middots.
        tests/homepage.py carries them in NOT_RENDERED with the other specs.
      */}
    </div>
  )
}

function Roadmap() {
  const c = home.roadmap
  return (
    <section id="roadmap" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.intro}</p>
      <ol className="mt-16 border-t border-rule">
        {c.phases.map((p) => (
          <li
            key={p.title}
            className="grid gap-2 border-b border-rule py-6 md:grid-cols-[minmax(0,26rem)_1fr] md:gap-10"
          >
            {/* The dates are scaffolding, so they are muted. The activity is the content. */}
            <h3 className="font-mono text-[0.9rem] leading-relaxed text-ink-muted">{p.title}</h3>
            <p className="leading-relaxed text-ink">{p.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-[68ch] text-[0.9rem] text-ink-muted">{c.note}</p>
    </section>
  )
}

function Outputs() {
  const c = home.outputs
  return (
    <section id="outputs" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.intro}</p>
      <dl className="mt-16 grid border-t border-l border-rule md:grid-cols-2">
        {c.items.map((o) => (
          <div key={o.title} className="border-r border-b border-rule bg-surface-raised p-6">
            <dt className="text-[1.25rem] font-semibold">{o.title}</dt>
            <dd className="mt-3 leading-relaxed text-ink-muted">{o.body}</dd>
          </div>
        ))}
      </dl>
      <SectionLink href={home.nav.outputsLink.href} label={home.nav.outputsLink.label} />
    </section>
  )
}

function Events() {
  const c = home.events
  return (
    <section id="events" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.intro}</p>
      <p className={`mt-8 leading-relaxed text-ink-muted ${PROSE}`}>{c.plannedStrands}</p>
      <SectionLink href={home.nav.eventsLink.href} label={home.nav.eventsLink.label} />
    </section>
  )
}

function Team() {
  const c = home.team
  return (
    <section id="team" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.intro}</p>

      <h3 className={`mt-16 ${LABEL}`}>{c.investigatorsLabel}</h3>
      <ul className="mt-6 grid border-t border-l border-rule md:grid-cols-2">
        {c.investigators.map((person) => (
          <Person key={person.name} person={person} />
        ))}
      </ul>

      <h3 className={`mt-12 ${LABEL}`}>{c.partnersLabel}</h3>
      <ul className="mt-6 grid border-t border-l border-rule md:grid-cols-2">
        {c.partners.map((person) => (
          <Person key={person.name} person={person} />
        ))}
      </ul>

      <SectionLink href={home.nav.teamLink.href} label={home.nav.teamLink.label} />
    </section>
  )
}

/**
 * One team card. The headshots arrived at mixed sizes and in two different
 * registers, studio portraits against an outdoor photograph, so all of them get
 * the same square crop, taken at 28 percent from the top so faces land in frame and the same desaturation. Uniform
 * treatment beats mixed quality. The frame is drawn even when no headshot has
 * been supplied, so the grid does not go ragged.
 */
function Person({ person }: { person: { name: string; role: string; image: string } }) {
  return (
    <li className="flex gap-4 border-r border-b border-rule bg-surface-raised p-6">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden border border-rule bg-surface">
        {person.image ? (
          // A plain img rather than next/image. These are 96px avatars from
          // local files, so the optimizer buys little, and its lazy loading and
          // srcset were failing to resolve for the larger source files.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.image}
            alt={person.name}
            width={96}
            height={96}
            decoding="async"
            className="h-full w-full object-cover object-[center_28%] [filter:var(--ag-portrait-filter)]"
          />
        ) : (
          /*
            Three partners have supplied no headshot. The frame is drawn either
            way so the grid does not go ragged, and it carries their initials
            rather than nothing, which read as a loading failure. Hidden from
            assistive technology: the name is the next thing in the card.
          */
          <span aria-hidden="true" className="text-[1.25rem] font-medium text-ink-muted">
            {initials(person.name)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[1.25rem] font-semibold">{person.name}</p>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">{person.role}</p>
      </div>
    </li>
  )
}

function Collaborate() {
  const c = home.collaborate
  const fields = parts(c.formFields)
  return (
    <section id="collaborate" data-above-globe
      className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.intro}</p>

      <dl className={`mt-10 space-y-6 ${PROSE}`}>
        {c.audiences.map((a) => (
          <div key={a.label}>
            <dt className="font-semibold text-accent">{a.label}</dt>
            <dd className="mt-1 leading-relaxed text-ink-muted">{a.text}</dd>
          </div>
        ))}
      </dl>

      {/* Fields come from the copy. No endpoint exists yet, so this does not submit. */}
      <form className="mt-16 grid max-w-[46rem] gap-6 md:grid-cols-2">
        {fields.map((field, i) => (
          <label
            key={field}
            className={i === fields.length - 1 ? 'block md:col-span-2' : 'block'}
          >
            <span className={LABEL}>{field}</span>
            {i === fields.length - 1 ? (
              <textarea
                rows={5}
                name={field}
                className="mt-2 w-full border border-rule bg-surface-raised p-3 text-ink"
              />
            ) : (
              <input
                type="text"
                name={field}
                className="mt-2 w-full border border-rule bg-surface-raised p-3 text-ink"
              />
            )}
          </label>
        ))}
      </form>

      <p className="mt-8 max-w-[68ch] text-[0.9rem] text-ink-muted">{c.fallback}</p>
      <p className="mt-2">
        <a
          href={`mailto:${c.email}`}
          className="font-mono text-accent underline underline-offset-4"
        >
          {c.email}
        </a>
      </p>
    </section>
  )
}

function Footer() {
  const c = home.footer
  return (
    <footer id="footer" data-above-globe
      className={`${SECTION} py-16 md:py-20`}>
      <div className="grid gap-10 sm:grid-cols-3">
        {home.nav.footerColumns.map((column) => (
          <nav key={column.heading} aria-labelledby={`footer-${column.heading}`}>
            <h2 id={`footer-${column.heading}`} className={LABEL}>
              {column.heading}
            </h2>
            <ul className="mt-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-[0.9rem] text-ink underline underline-offset-4"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-16 border-t border-rule pt-8">
        <InstitutionLogos />
      </div>

      <div className="mt-12 max-w-[68ch] space-y-4 text-[0.9rem] leading-relaxed text-ink-muted">
        {c.lines.map((line) => (
          <p key={line.slice(0, 32)}>{line}</p>
        ))}
      </div>
    </footer>
  )
}
