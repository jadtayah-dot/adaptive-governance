import outputs from '@/content/outputs.json'
import home from '@/content/home.json'

/*
  Published work.

  The route was linked from section seven of the homepage and from the footer
  and returned 404, which is what a reviewer following "See all outputs" got.

  What a published item has to carry is what a reader needs to cite it and to
  decide whether to download it: who wrote it, when, under which grant, how long
  it is and how large the file is. A bare link to a PDF is not a publication
  page, it is a file on a server.

  The list comes from content/outputs.json so that adding the next one is an
  edit to a data file, which is what PRODUCT.md asks for.
*/

export const metadata = {
  title: 'Outputs',
  description: home.outputs.intro,
}

const SECTION = 'w-full px-6 py-20 md:px-10 md:py-32 2xl:px-16'
const LABEL = 'font-mono text-[0.8rem] tracking-wide text-ink-muted'

/** Megabytes to one decimal, so a reader knows what they are about to pull. */
function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function OutputsPage() {
  const c = home.outputs
  const labels = outputs.labels
  const published = outputs.published

  return (
    <div data-above-globe className={SECTION}>
      <h1 className="text-[2.25rem] leading-tight font-semibold tracking-tight md:text-[3rem]">
        {c.heading}
      </h1>
      <p className="mt-5 max-w-[68ch] text-[1.25rem] leading-snug text-ink-muted">{c.intro}</p>

      {published.length === 0 ? (
        <p className="mt-16 max-w-[68ch] border-l-2 border-l-rule pl-4 leading-relaxed text-ink-muted">
          {c.emptyState}
        </p>
      ) : (
        <ul className="mt-16 border-t border-rule">
          {published.map((item) => (
            <li key={item.slug} className="border-b border-rule py-10">
              <article className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
                {/*
                  The cover, at the size it was rendered. Explicit width and
                  height, and a plain img rather than next/image, which is the
                  rule the portraits already follow.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.cover}
                  alt={item.coverAlt}
                  width={720}
                  height={1019}
                  className="w-full max-w-[13rem] border border-rule bg-surface"
                />

                <div className="min-w-0">
                  <p className={LABEL}>
                    {item.kind} · {item.year}
                  </p>
                  <h2 className="mt-2 max-w-[34ch] text-[1.6rem] leading-tight font-semibold tracking-tight">
                    {item.title}
                  </h2>
                  <p className="mt-3 max-w-[68ch] leading-relaxed">{item.authors.join(' · ')}</p>
                  <p className="mt-1 max-w-[68ch] text-[0.9rem] leading-relaxed text-ink-muted">
                    {item.institution}
                  </p>

                  {item.summary ? (
                    <p className="mt-6 max-w-[68ch] leading-relaxed">{item.summary}</p>
                  ) : null}

                  <p className="mt-8">
                    <a
                      href={item.file}
                      className="inline-flex min-h-11 items-center border border-rule px-4 text-[0.9rem] text-accent underline underline-offset-4"
                    >
                      {labels.download}
                    </a>
                  </p>
                  {/*
                    Beside the link rather than inside it, so the link text stays
                    the same for every item and the particulars are still read
                    out when a reader tabs onto it.
                  */}
                  <p className={`mt-2 ${LABEL}`}>
                    {item.format} · {item.pages} {labels.pages} · {megabytes(item.bytes)}
                  </p>

                  <p className="mt-8 max-w-[68ch] text-[0.9rem] leading-relaxed text-ink-muted">
                    {item.grant}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
