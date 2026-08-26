'use client'

import { useMemo } from 'react'

import counts from '@/content/corpus by country.json'
import names from '@/content/country names.json'
import summary from '@/content/corpus summary.json'
import copy from '@/content/globe.json'

/*
  The corpus, on the homepage, beside the globe.

  Clicking a country used to leave for /corpus. Now the records open here and
  the globe stays live, so choosing another country is one click rather than a
  page load and a scroll back. /corpus is unchanged and is still where the full
  record lives: every field, citable, linked from under this list and from the
  navigation. This is a summary, five fields, and it says so.

  It is also the keyboard path to the globe. The country index is a real list of
  real buttons carrying the same counts the polygons carry and reaching the same
  filtered views, so the globe is not the only way in. That was recorded as an
  open item against the globe well and this closes it.

  The records ship as content/corpus summary.json, five fields rather than the
  twenty nine in content/corpus.json, which is nearly half a megabyte and has no
  business being downloaded for a list that shows a title and a year.
*/

interface Summary {
  id: string
  title: string
  authors: string[]
  year: number
  countries: string[]
  url: string
}

const RECORDS = summary as Summary[]
const COUNTS = (counts as { byCountry: Record<string, number> }).byCountry
const NAMES = names as Record<string, string>

/** Every country the corpus reaches, most studied first, then alphabetical. */
const INDEX = Object.entries(COUNTS)
  .filter(([, n]) => n > 0)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

export interface CorpusPanelProps {
  /** ISO alpha 3, or null for the index. */
  country: string | null
  onSelect: (code: string) => void
  onClear: () => void
  /** Focusing anything here is a reader arriving at the globe by keyboard. */
  onEnter: () => void
}

export default function CorpusPanel({ country, onSelect, onClear, onEnter }: CorpusPanelProps) {
  const c = copy.panel
  const shown = useMemo(
    () => (country ? RECORDS.filter((r) => r.countries.includes(country)) : []),
    [country],
  )

  const name = (code: string) => NAMES[code] ?? code
  const label = (n: number) => `${n} ${n === 1 ? copy.tooltip.study : copy.tooltip.studies}`

  return (
    <section
      aria-label={c.label}
      onFocusCapture={onEnter}
      className="pointer-events-auto flex h-full flex-col border-l border-rule bg-surface/95 backdrop-blur-sm"
    >
      {country ? (
        <>
          <header className="border-b border-rule px-6 py-5">
            <p className={LABEL}>{label(COUNTS[country] ?? 0)}</p>
            <h3 className="mt-1 text-[1.6rem] leading-tight font-semibold">{name(country)}</h3>
            <button
              type="button"
              onClick={onClear}
              className="mt-4 inline-flex min-h-11 items-center text-[0.9rem] text-accent underline underline-offset-4"
            >
              {c.clear}
            </button>
          </header>

          <ol className="min-h-0 flex-1 overflow-y-auto">
            {shown.map((r) => (
              <li key={r.id} className="border-b border-rule px-6 py-4">
                <p className="text-[0.95rem] leading-snug">
                  <a
                    href={r.url}
                    className="text-ink underline underline-offset-4 hover:text-accent"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.title}
                  </a>
                </p>
                <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-muted">
                  {r.authors.join('; ')}
                </p>
                <p className={`mt-1 ${LABEL}`}>
                  {r.year} · {r.countries.map(name).join(' · ')}
                </p>
              </li>
            ))}
          </ol>

          <footer className="border-t border-rule px-6 py-5">
            <a
              href={`/corpus?country=${encodeURIComponent(country)}`}
              className="inline-flex min-h-11 items-center text-[0.9rem] text-accent underline underline-offset-4"
            >
              {c.full}
            </a>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-muted">{c.fullDetail}</p>
          </footer>
        </>
      ) : (
        <>
          <header className="border-b border-rule px-6 py-5">
            <h3 className="text-[1.25rem] leading-tight font-semibold">{c.indexHeading}</h3>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-muted">{c.indexDetail}</p>
          </header>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {INDEX.map(([code, n]) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => onSelect(code)}
                  className="flex min-h-11 w-full items-baseline justify-between gap-4 border-b border-rule px-6 py-3 text-left hover:bg-surface-raised"
                >
                  <span className="text-[0.95rem] text-ink">{name(code)}</span>
                  <span className={LABEL}>{n}</span>
                </button>
              </li>
            ))}
          </ul>

          <footer className="border-t border-rule px-6 py-5">
            <a
              href="/corpus"
              className="inline-flex min-h-11 items-center text-[0.9rem] text-accent underline underline-offset-4"
            >
              {c.full}
            </a>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-muted">{c.fullDetail}</p>
          </footer>
        </>
      )}
    </section>
  )
}

const LABEL = 'font-mono text-[0.8rem] tracking-wide text-ink-muted'
