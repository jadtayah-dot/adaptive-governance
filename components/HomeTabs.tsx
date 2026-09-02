'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

/*
  Four homepage sections, shown one at a time on narrow viewports.

  The homepage is 31 phone screens. Roughly none of that is spacing: all section
  padding and every margin over 32 pixels together come to under 15% of the
  page. The length is copy, set at about 38 characters per line, and the copy is
  not mine to cut. So the fix is to stop asking a phone to scroll past four
  sections it did not choose. Roadmap, outputs, events and team are the four
  that already have their own routes, and together they are 11.3 of the 31.

  Three properties this has to keep, in order of how much damage breaking them
  would do.

  Desktop is untouched. Above TABBED_MAX_WIDTH this renders its panels in
  document order with no tablist, no roles and no hidden panels, which is the
  markup the page had before.

  It works with no JavaScript. The server renders the desktop arrangement, so a
  phone with a failed or pending hydration gets every section stacked, which is
  also what the page did before. Tabs are an enhancement on top of a page that
  already reads.

  The roles follow the behaviour. A tablist that is only a tablist at some
  widths cannot be expressed in CSS, because ARIA has no media query. So the
  width is subscribed to rather than styled around, and role, aria-selected and
  aria-controls are present only where a tab actually exists.
*/

/** Above this the sections are stacked in document order, as they always were. */
export const TABBED_MAX_WIDTH = 1024

export interface HomeTab {
  /** The section id, which is also the nav anchor target. */
  id: string
  /** Verbatim from content/home.json. No label is written here. */
  label: string
  panel: React.ReactNode
}

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function isNarrow() {
  return window.innerWidth < TABBED_MAX_WIDTH
}

/* Unknown on the server, and unknown means the stacked arrangement. */
function serverIsNarrow() {
  return false
}

export default function HomeTabs({ tabs }: { tabs: HomeTab[] }) {
  const narrow = useSyncExternalStore(subscribe, isNarrow, serverIsNarrow)
  const [active, setActive] = useState(tabs[0].id)

  /*
    The primary nav links to #outputs, #events and #team. Inside a tab set those
    anchors would land on a hidden panel and look like a dead link, so the hash
    selects the tab as well. Both on arrival and on later clicks, because a hash
    link to the current page fires hashchange and no navigation.
  */
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1)
      if (tabs.some((t) => t.id === id)) setActive(id)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [tabs])

  /* Left and right move between tabs, which is what a tablist owes a keyboard. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(index + step + tabs.length) % tabs.length]
    setActive(next.id)
    document.getElementById(`hometab-${next.id}`)?.focus()
  }

  return (
    <>
      {narrow ? (
        <div
          role="tablist"
          aria-label={tabs.map((t) => t.label).join(', ')}
          className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-6 gap-y-3 border-b border-rule px-6 pb-4"
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              id={`hometab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={active === tab.id}
              aria-controls={`homepanel-${tab.id}`}
              tabIndex={active === tab.id ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`min-h-11 font-mono text-[0.8rem] tracking-wide underline-offset-8 ${
                active === tab.id
                  ? 'text-accent underline decoration-2'
                  : 'text-ink-muted underline decoration-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={narrow ? `homepanel-${tab.id}` : undefined}
          role={narrow ? 'tabpanel' : undefined}
          aria-labelledby={narrow ? `hometab-${tab.id}` : undefined}
          hidden={narrow && active !== tab.id}
        >
          {tab.panel}
        </div>
      ))}
    </>
  )
}
