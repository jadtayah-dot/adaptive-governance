import GlobeStage from '@/components/GlobeStage'
import globe from '@/content/globe.json'
import home from '@/content/home.json'

// Every string on this page comes from content/home.json, which is a verbatim
// transcription of docs/website content.md. No copy is written here.

const SECTION = 'mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-32'
const PROSE = 'max-w-[68ch]'
const H2 = 'text-[2rem] leading-tight font-semibold tracking-tight'
// No text-transform here. Uppercasing would alter the copy as displayed, and the
// hero metadata line and the team labels carry names and titles.
const LABEL = 'font-mono text-[0.8rem] tracking-wide text-ink-muted'

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

export default function Home() {
  return (
    <div className="bg-surface text-ink">
      {/*
        The argument. One globe, pinned behind these five sections, with the
        prose passing over it. The container ends at the bottom of the globe
        well, which is where the pin releases and the globe is handed over to
        the reader. Everything after the well is ordinary page again.
      */}
      <GlobeStage>
        <Hero />
        <Studies />
        <Cases />
        <Objectives />
        <CorpusOpening />
        <GlobeLayers />
        <GlobeWell />
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
    <section id="hero" className={`${SECTION} border-b border-rule`}>
      <h1 className="max-w-[20ch] text-[2.25rem] leading-[1.1] font-semibold tracking-tight md:text-[3rem]">
        {c.title}
      </h1>
      <p className="mt-6 max-w-[46ch] text-[1.25rem] leading-snug text-accent">{c.subtitle}</p>
      <p className={`mt-8 text-[1.25rem] leading-relaxed ${PROSE}`}>{c.standfirst}</p>
      <p className={`mt-10 ${LABEL} not-italic leading-relaxed`}>{c.metadata}</p>
      {/*
        True on both paths. Below MIN_LIVE_WIDTH there is no scroll driven
        globe to promise, and this line does not promise one.
      */}
      <p className="mt-16 max-w-[46ch] text-[0.9rem] text-ink-muted">{c.globeLine}</p>
    </section>
  )
}

function Studies() {
  const c = home.studies
  return (
    <section id="studies" className={`${SECTION} border-b border-rule`}>
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
    <section id="cases" className={`${SECTION} border-b border-rule`}>
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
    <section id="objectives" className={`${SECTION} border-b border-rule`}>
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
function CorpusOpening() {
  const c = home.corpus
  return (
    <section id="corpus" className={`${SECTION} pb-0 md:pb-0`}>
      <h2 className={H2}>{c.heading}</h2>
      <div className={`mt-10 space-y-6 ${PROSE}`}>
        {c.body.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </div>
    </section>
  )
}

/*
  The three layers of the argument, as ordinary page content.

  Below MIN_LIVE_WIDTH the live scene does not run, so there is no exploded
  diagram to annotate and no overlay to annotate it with. The same copy appears
  here instead, in document order, ahead of the still it describes. On the live
  path this is hidden and the annotations arrive over the globe as each shell
  detaches.
*/
function GlobeLayers() {
  const c = globe
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-16 md:px-10 min-[1200px]:hidden">
      <dl className="grid border-t border-l border-rule sm:grid-cols-3">
        {c.shells.map((shell) => (
          <div key={shell.id} className="border-r border-b border-rule bg-surface-raised p-6">
            <dt className="font-mono text-[0.9rem] text-accent">{shell.label}</dt>
            <dd className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">{shell.gloss}</dd>
          </div>
        ))}
      </dl>
      <p className={`mt-10 border-l-2 border-l-accent pl-4 leading-relaxed ${PROSE}`}>
        {c.descentNote}
      </p>
      {/* The second colour, marking evidence this project is creating. */}
      <p className={`mt-4 border-l-2 border-l-globe-project pl-4 leading-relaxed ${PROSE}`}>
        {c.nodesNote}
      </p>
    </div>
  )
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
    <div className="mx-auto w-full max-w-5xl px-6 pt-16 md:px-10">
      {/*
        A viewport height well on the live path, because that is the box the
        pinned layer comes to rest in. On the static path it is square, to the
        still it holds: a viewport height frame around a square image on a phone
        is mostly empty frame.
      */}
      <div
        id="globe"
        data-testid="globe-placeholder"
        className="aspect-square w-full border border-rule min-[1200px]:aspect-auto min-[1200px]:h-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/globe-still.png"
          alt={globe.stillAlt}
          width={880}
          height={880}
          className="h-full w-full object-contain min-[1200px]:hidden"
        />
      </div>
    </div>
  )
}

function CorpusEvidence() {
  const c = home.corpus
  return (
    <div className={`${SECTION} border-b border-rule pt-0 md:pt-0`}>
      <p className="mt-6 max-w-[68ch] text-[0.9rem] leading-relaxed text-ink-muted">
        {c.globeNote}
      </p>

      <SectionLink
        href={home.nav.corpusLink.href}
        label={home.nav.corpusLink.label}
        detail={home.nav.corpusLink.detail}
      />

      {/* Rendered as the literal lines from the copy, middots included. */}
      <div className="mt-16 grid border-t border-l border-rule md:grid-cols-2">
        <p className="border-r border-b border-rule bg-surface-raised p-6 text-[0.9rem] leading-relaxed text-ink-muted">
          {c.filterLabels}
        </p>
        <p className="border-r border-b border-rule bg-surface-raised p-6 text-[0.9rem] leading-relaxed text-ink-muted">
          {c.recordDetailFields}
        </p>
      </div>
    </div>
  )
}

function Roadmap() {
  const c = home.roadmap
  return (
    <section id="roadmap" className={`${SECTION} border-b border-rule`}>
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
    <section id="outputs" className={`${SECTION} border-b border-rule`}>
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
    <section id="events" className={`${SECTION} border-b border-rule`}>
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
    <section id="team" className={`${SECTION} border-b border-rule`}>
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
      <div className="size-24 shrink-0 overflow-hidden border border-rule bg-surface">
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
        ) : null}
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
    <section id="collaborate" className={`${SECTION} border-b border-rule`}>
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
    <footer id="footer" className={`${SECTION} py-16 md:py-20`}>
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

      <div className="mt-16 max-w-[68ch] space-y-4 border-t border-rule pt-8 text-[0.9rem] leading-relaxed text-ink-muted">
        {c.lines.map((line) => (
          <p key={line.slice(0, 32)}>{line}</p>
        ))}
      </div>
    </footer>
  )
}
