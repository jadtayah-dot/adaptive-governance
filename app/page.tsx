import GlobeMount from '@/components/GlobeMount'
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
      <Hero />
      <Studies />
      <Cases />
      <Objectives />
      <Corpus />
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
      <p className="mt-16 max-w-[46ch] text-[0.9rem] text-ink-muted">{c.scrollCue}</p>
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

function Corpus() {
  const c = home.corpus
  return (
    <section id="corpus" className={`${SECTION} border-b border-rule`}>
      <h2 className={H2}>{c.heading}</h2>
      <div className={`mt-10 space-y-6 ${PROSE}`}>
        {c.body.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </div>

      {/*
        Full viewport height globe well. Stage one: country polygons lit by
        record count, slow rotation, hover and click. No scroll behaviour yet.
        Still aria-hidden, and the canvas takes no focus: the same counts are
        readable in the corpus table linked directly below. That is a holding
        position, not a decision, and it needs revisiting before launch.
      */}
      <div
        id="globe"
        data-testid="globe-placeholder"
        aria-hidden="true"
        className="mt-16 h-screen w-full border border-rule bg-surface-raised"
      >
        <GlobeMount />
      </div>

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
    </section>
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
