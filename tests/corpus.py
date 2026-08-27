"""
Corpus page check.

  python tests/corpus.py

Needs `npm run dev` running.

Ten things, all of which have been wrong at some point while this page was
built:

  1. The derived breakdowns reach the corpus. Only normativeStance is a coded
     field; level, method and sector are free text with close to one distinct
     wording per record, so the groups are drawn by rule. This asserts how much
     of the corpus each rule set reaches, and fails if the unclassified share
     rises above the ceilings recorded here.
  2. The headline count, the country bars and the four panels agree with the
     records the table is actually showing.
  3. A selection is additive, is a union inside one breakdown and an
     intersection across two, and survives a cold load from the address alone.
  4. Motion is transform and opacity only, and nothing runs longer than 400ms.
  5. Under prefers reduced motion nothing is ever painted between two states.
  6. The table is closed to begin with, is not built until it is opened, and
     opens to exactly the records the headline claims.
  7. The preview is arithmetic, not decoration: the fraction of a bar left
     standing while a group is rested on is exactly the count that group turns
     out to hold once it is chosen.
  8. The year strip runs continuously, its tracks share a baseline, and a year
     is additive like every other choice.
  9. It works at 390: no horizontal scroll, no truncated country name, and every
     control, table opened, clears the 24 pixel minimum target.
 10. Scrolling is not pointing. A list scrolled under a still pointer must not
     set a preview, and a real hover must still set one.

The bar colours are not checked here. They are tokens walked by color-mix, and
tests/palette.py checks both ends of that walk and fifty points along it against
the page and against the track the bars are drawn on.
"""

import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "http://localhost:3000/corpus"
NARROW = 390

# Ceilings on the share of the corpus a rule set fails to place, per dimension.
# These are the measured values at the time the rules were written, rounded up.
# Raising one is a decision, not a fix: see scripts/dimension coverage.mjs.
UNCLASSIFIED_CEILING = {
    "Normative stance": 0.0,
    "Level of governance": 2.0,
    "Research design": 2.0,
    "Sector": 2.5,
}

MAX_DURATION_MS = 400
MIN_TARGET_PX = 24
# The preview predicts a count off a transform, so it is compared to the count
# the same choice produces with a tolerance of one study for rounding.
PREVIEW_TOLERANCE = 1


def records():
    with open(os.path.join(ROOT, "content", "corpus.json"), encoding="utf-8") as f:
        return json.load(f)


def duration_ms():
    """Read out of lib/corpus-motion.ts rather than repeated here."""
    with open(os.path.join(ROOT, "lib", "corpus-motion.ts"), encoding="utf-8") as f:
        m = re.search(r"DURATION\s*=\s*(\d+)", f.read())
    if not m:
        raise SystemExit("could not find DURATION in lib/corpus-motion.ts")
    return int(m.group(1))


# The count on screen is animated: a block below the fold is drawn empty and
# grows when it is scrolled to, so reading the visible number reads zero for
# anything not yet looked at. data-value is what the row stands for, and is also
# what a screen reader is told.
PANELS = """
() => {
  const out = {};
  for (const s of document.querySelectorAll('section[aria-labelledby^="breakdown-"]')) {
    const rows = {};
    for (const li of s.querySelectorAll('li[data-bar]')) {
      const label = li.querySelector('button > span > span').textContent.trim();
      rows[label] = Number(li.dataset.value);
    }
    out[s.querySelector('h3').textContent.trim()] = rows;
  }
  return out;
}
"""

# Every country row: its count, its rank position, and how much of its bar is
# left standing. `visible` is the fill less whatever the erase covers, which
# with no preview running is simply the bar.
COUNTRY_ROWS = """
() => {
  const ul = [...document.querySelectorAll('ul')].find(u => u.children.length > 40);
  if (!ul) return null;
  return [...ul.children].map(li => {
    const sp = li.querySelectorAll('button > span');
    const t = li.style.transform.match(/translate3d\\(0px, ([-\\d.]+)px/);
    const f = li.querySelector('[data-part="fill"]').style.transform.match(/scaleX\\(([\\d.]+)\\)/);
    const e = li.querySelector('[data-part="erase"]').style.transform.match(/scaleX\\(([\\d.]+)\\)/);
    return {
      key: li.dataset.bar,
      name: sp[0].textContent.trim(),
      value: Number(li.dataset.value),
      // Rows below the cut stay in the DOM so the ranking can animate across
      // it, stacked on the last visible row and taken out of the accessibility
      // tree. They share a position, so nothing can be concluded from it.
      hidden: li.getAttribute('aria-hidden') === 'true',
      y: t ? parseFloat(t[1]) : null,
      visible: (f ? parseFloat(f[1]) : 0) - (e ? 1 - parseFloat(e[1]) : 0) < 0
        ? 0
        : 1 - (e ? parseFloat(e[1]) : 1),
      truncated: sp[0].scrollWidth > sp[0].clientWidth + 1,
    };
  });
}
"""

YEAR_COLUMNS = """
() => {
  const ul = document.querySelector('#years-heading').parentElement.querySelector('ul');
  return [...ul.children].map(li => {
    const track = li.querySelector('[data-part="fill"]').parentElement.getBoundingClientRect();
    return {
      key: li.dataset.bar,
      value: Number(li.dataset.value),
      top: Math.round(track.top),
      bottom: Math.round(track.bottom),
      width: Math.round(li.getBoundingClientRect().width),
    };
  });
}
"""

# Row positions are exact multiples of the row height at rest and fractional
# while a tween is running, so counting fractional rows counts painted frames of
# animation without reaching into the component.
SAMPLE_WHILE = """
(ms) => new Promise(r => {
  const ul = [...document.querySelectorAll('ul')].find(u => u.children.length > 40);
  const fractional = () => [...ul.children].filter(li => {
    const m = li.style.transform.match(/translate3d\\(0px, ([-\\d.]+)px/);
    return m && Math.abs(parseFloat(m[1]) % 28) > 0.01;
  }).length;
  const t0 = performance.now();
  let frames = 0, moving = 0, last = 0;
  const tick = () => {
    const n = fractional();
    frames++;
    if (n > 0) { moving++; last = performance.now() - t0; }
    if (performance.now() - t0 < ms) requestAnimationFrame(tick);
    else r({ frames, moving, lastMovingAt: last });
  };
  requestAnimationFrame(tick);
})
"""


# Counts frames in which the longest bar is cut back by a preview. With nothing
# previewed the erase covers exactly the empty part of the track, so the longest
# bar has essentially no erase at all. Anything more, while the reader is only
# scrolling, is a preview nobody asked for.
WATCH_CUTS = r"""
() => {
  window.__cuts = 0;
  window.__frames = 0;
  const ul = [...document.querySelectorAll('ul')].find(u => u.children.length > 40);
  const longest = [...ul.children].reduce((best, li) =>
    Number(li.dataset.value) > Number(best.dataset.value) ? li : best);
  const erase = longest.querySelector('[data-part="erase"]');
  const tick = () => {
    window.__frames++;
    const m = erase.style.transform.match(/scaleX\(([\d.]+)\)/);
    if (m && parseFloat(m[1]) > 0.02) window.__cuts++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
"""


def headline(page):
    """
    The settled count, not the counting one.

    The visible number counts to its new value over the motion duration, so
    reading it is a race. The value carried beside it for assistive technology
    is written once per selection and is the answer, which is also the thing a
    screen reader is actually told.
    """
    text = page.locator('[aria-live="polite"] span.sr-only').first.text_content()
    return int(re.search(r"(\d+)", text).group(1))


def ready(page):
    """
    Waits for the bars to be there and for the entrance to have finished.

    Blocks are drawn empty and grown when they are scrolled to, so reading a
    count too early reads a number on its way up rather than the answer.
    """
    page.wait_for_selector("[data-bar]")
    page.wait_for_timeout(duration_ms() + 500)


def disclosure(page):
    return page.locator('button[aria-controls="records"]')


def open_table(page):
    if disclosure(page).get_attribute("aria-expanded") == "false":
        disclosure(page).click()
        page.wait_for_selector("table tbody tr")


def table_rows(page):
    return page.locator("table tbody tr").count()


def panel_button(page, panel, label):
    return page.locator(
        f'section[aria-labelledby="breakdown-{panel}"] button', has_text=re.compile(rf"^{label}")
    ).first


def click_panel(page, panel, label):
    panel_button(page, panel, label).click()
    page.wait_for_timeout(700)


def main():
    problems = []
    notes = []
    total = len(records())
    duration = duration_ms()
    notes.append(f"  motion duration {duration}ms, ceiling {MAX_DURATION_MS}ms")
    if duration > MAX_DURATION_MS:
        problems.append(f"DURATION is {duration}ms, over the {MAX_DURATION_MS}ms ceiling")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ------------------------------------------------------ 1, 2 and 6
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(URL)
        ready(page)

        if disclosure(page).get_attribute("aria-expanded") != "false":
            problems.append("the table is open on arrival, not closed")
        if page.locator("table").count() != 0:
            problems.append("the table is built before it is opened")
        closed_height = page.evaluate("() => document.documentElement.scrollHeight")

        if headline(page) != total:
            problems.append(f"headline reads {headline(page)} with no selection, not {total}")

        open_table(page)
        open_height = page.evaluate("() => document.documentElement.scrollHeight")
        notes.append(f"  page {closed_height}px closed, {open_height}px open")
        if closed_height >= open_height:
            problems.append(
                f"closing the table saved nothing: {closed_height}px against {open_height}px"
            )
        if table_rows(page) != total:
            problems.append(f"table holds {table_rows(page)} rows with no selection, not {total}")
        if disclosure(page).get_attribute("aria-expanded") != "true":
            problems.append("the disclosure does not report itself expanded once opened")

        panels = page.evaluate(PANELS)
        if len(panels) != 4:
            problems.append(f"{len(panels)} breakdowns on the page, not 4")

        for name, rows in panels.items():
            unplaced = sum(n for label, n in rows.items() if "not classified" in label.lower())
            share = unplaced / total * 100
            ceiling = UNCLASSIFIED_CEILING.get(name)
            notes.append(f"  {name:<22} {len(rows)} groups, {unplaced} unplaced ({share:.1f}%)")
            if ceiling is None:
                problems.append(f"no unclassified ceiling recorded for the {name} breakdown")
            elif share > ceiling:
                problems.append(
                    f"the {name} rules leave {share:.1f}% of the corpus unplaced, over the "
                    f"{ceiling}% ceiling in tests/corpus.py"
                )

        # Normative stance is one group per study, so with no selection it has to
        # account for the corpus exactly. The other three are multi valued.
        stance_total = sum(panels["Normative stance"].values())
        if stance_total != total:
            problems.append(
                f"the normative stance groups sum to {stance_total}, not {total}, "
                "so the one coded field is either double counting or dropping records"
            )

        country_rows = page.evaluate(COUNTRY_ROWS)
        if country_rows is None:
            problems.append("no country ranking found on the page")
        else:
            mentions = sum(r["value"] for r in country_rows)
            visible = [r for r in country_rows if not r["hidden"]]
            notes.append(
                f"  country ranking {len(country_rows)} rows, {len(visible)} shown, "
                f"{mentions} mentions"
            )
            order = [r["value"] for r in sorted(visible, key=lambda r: r["y"])]
            if order != sorted(order, reverse=True):
                problems.append("the country ranking is not in descending order")
            # Everything hidden has to be smaller than everything shown, or the
            # cut is not a cut.
            if visible and len(visible) < len(country_rows):
                floor = min(r["value"] for r in visible)
                over = [r["name"] for r in country_rows if r["hidden"] and r["value"] > floor]
                if over:
                    problems.append(
                        "the ranking hides countries that outrank shown ones: "
                        + ", ".join(over[:4])
                    )
            # And a hidden row must not be reachable by keyboard.
            reachable = page.evaluate(
                """() => {
                    const ul = [...document.querySelectorAll('ul')].find(u => u.children.length > 40);
                    return [...ul.children]
                      .filter(li => li.getAttribute('aria-hidden') === 'true')
                      .filter(li => li.querySelector('button')?.tabIndex !== -1).length;
                }"""
            )
            if reachable:
                problems.append(
                    f"{reachable} hidden country row(s) are still in the tab order"
                )

        # ------------------------------------------------------ 8 the year strip
        columns = page.evaluate(YEAR_COLUMNS)
        keys = [int(c["key"]) for c in columns]
        notes.append(
            f"  year strip {len(columns)} columns, {keys[0]} to {keys[-1]}, "
            f"{sum(c['value'] for c in columns)} studies"
        )
        if keys != list(range(keys[0], keys[-1] + 1)):
            problems.append("the year strip skips a year rather than drawing it empty")
        if len({c["top"] for c in columns}) != 1 or len({c["bottom"] for c in columns}) != 1:
            problems.append(
                "the year strip tracks do not share a baseline, so the columns cannot be compared"
            )
        if len({c["width"] for c in columns}) != 1:
            problems.append("the year strip columns are not all the same width")
        if sum(c["value"] for c in columns) != total:
            problems.append(
                f"the year strip holds {sum(c['value'] for c in columns)} studies, not {total}"
            )

        # ------------------------------------------------------ 7 the preview
        # What a group promises while it is rested on has to be what it delivers
        # when it is chosen. Both are read off the page, so nothing here repeats
        # the classification rules.
        before = {r["key"]: r for r in page.evaluate(COUNTRY_ROWS)}
        peak = max(r["value"] for r in before.values())
        panel_button(page, "Sector", "Water").hover()
        page.wait_for_timeout(150)
        previewed = {r["key"]: r["visible"] * peak for r in page.evaluate(COUNTRY_ROWS)}

        click_panel(page, "Sector", "Water")
        after = {r["key"]: r["value"] for r in page.evaluate(COUNTRY_ROWS)}

        checked = [k for k in after if before[k]["value"] >= 5]
        off = [
            (k, round(previewed[k], 1), after[k])
            for k in checked
            if abs(previewed[k] - after[k]) > PREVIEW_TOLERANCE
        ]
        notes.append(f"  preview checked against {len(checked)} countries, {len(off)} off")
        for key, promised, delivered in off[:5]:
            problems.append(
                f"the preview promised {promised} studies for {key} and choosing it "
                f"delivered {delivered}"
            )

        # ------------------------------------------------------ 3 selections
        water = headline(page)
        if page.url.count("sector=water") != 1:
            problems.append(f"choosing Water did not reach the address: {page.url}")
        open_table(page)
        if table_rows(page) != water:
            problems.append(f"table holds {table_rows(page)} rows against a headline of {water}")

        click_panel(page, "Sector", "Climate")
        both = headline(page)
        notes.append(f"  water {water}, water or climate {both}, of {total}")
        if both <= water:
            problems.append(
                f"a second choice in the same breakdown gave {both} against {water}, "
                "so it narrowed rather than widened"
            )

        click_panel(page, "Level of governance", "Local")
        crossed = headline(page)
        notes.append(f"  and local {crossed}")
        if crossed >= both:
            problems.append(
                f"a choice in a second breakdown gave {crossed} against {both}, "
                "so it widened rather than narrowed"
            )

        # A year is additive in the same way, and reaches the address the same way.
        page.locator('#years-heading ~ div button').nth(15).click()
        page.wait_for_timeout(700)
        with_year = headline(page)
        notes.append(f"  and one year {with_year}")
        if "year=" not in page.url:
            problems.append(f"choosing a year did not reach the address: {page.url}")
        if with_year >= crossed:
            problems.append(
                f"a year gave {with_year} against {crossed}, so it widened rather than narrowed"
            )

        # The same address, loaded cold.
        deep = page.url
        cold = browser.new_page(viewport={"width": 1440, "height": 900})
        cold.goto(deep)
        ready(cold)
        if headline(cold) != with_year:
            problems.append(
                f"the address {deep} reads {headline(cold)} on a cold load, not {with_year}"
            )
        cold.close()

        page.get_by_role("button", name=re.compile("Clear the selection")).click()
        page.wait_for_timeout(700)
        if headline(page) != total:
            problems.append(f"clearing left {headline(page)} of {total}")

        # ------------------------------------------------------ 4 what moves
        animated = page.evaluate(
            """
            () => {
              const el = document.querySelector('li[data-bar]');
              const s = getComputedStyle(el);
              return { animation: s.animationName, transition: s.transitionProperty };
            }
            """
        )
        notes.append(
            f"  computed animation {animated['animation']}, transition {animated['transition']}"
        )
        if animated["animation"] != "none":
            problems.append(f"a bar carries a CSS animation: {animated['animation']}")

        inline = page.evaluate(
            """
            () => {
              const props = new Set();
              for (const el of document.querySelectorAll('[data-bar], [data-part]')) {
                for (const p of el.style) props.add(p);
              }
              return [...props].sort();
            }
            """
        )
        notes.append(f"  properties written on the bars: {', '.join(inline)}")
        # background-color and height are set once from the data and never
        # animated. pointer-events is a state, not a value on a curve: it takes
        # the rows below the cut out of reach, and it costs neither layout nor
        # paint. What this is guarding against is a width or a top being
        # tweened, which is what the rule in DESIGN.md is about.
        allowed = ("transform", "opacity", "background-color", "height", "pointer-events")
        costly = [p for p in inline if p not in allowed]
        if costly:
            problems.append(
                f"the bars are written with {', '.join(costly)}, which is not transform or opacity"
            )

        panel_button(page, "Sector", "Marine").click()
        run = page.evaluate(SAMPLE_WHILE, duration + 900)
        notes.append(
            f"  motion sampled {run['frames']} frames, {run['moving']} moving, "
            f"last movement {run['lastMovingAt']:.0f}ms in"
        )
        if run["moving"] == 0:
            problems.append("no frame of the ranking ever moved, so the bars are not animating")
        page.get_by_role("button", name=re.compile("Clear the selection")).click()
        page.wait_for_timeout(500)

        # ------------------------------------------------------ 5 reduced motion
        reduced = browser.new_page(
            viewport={"width": 1440, "height": 900}, reduced_motion="reduce"
        )
        reduced.goto(URL)
        ready(reduced)
        reduced.locator(
            'section[aria-labelledby="breakdown-Sector"] button', has_text=re.compile("^Water")
        ).first.click()
        run = reduced.evaluate(SAMPLE_WHILE, duration + 900)
        notes.append(f"  reduced motion sampled {run['frames']} frames, {run['moving']} moving")
        if run["moving"] > 0:
            problems.append(
                f"under prefers reduced motion {run['moving']} frames were painted between "
                "two states, so the sequence is being played rather than skipped"
            )
        if headline(reduced) >= total:
            problems.append("under reduced motion the selection did not apply at all")
        reduced.close()
        page.close()

        # ------------------------------------------------ 10 scrolling is not pointing
        #
        # Rows carried onMouseEnter, and enter fires whenever a row arrives
        # under the pointer. Scrolling a list under a pointer that is sitting
        # still does exactly that, so every row that slid past set a preview and
        # every other bar on the page was cut back to it, over and over, for the
        # whole scroll. It shipped, and it was reported as the bars rushing
        # through and drawing back.
        scroller = browser.new_page(viewport={"width": 1440, "height": 900})
        scroller.goto(URL)
        ready(scroller)

        box = scroller.locator("ul li[data-bar]").first.bounding_box()
        scroller.mouse.move(box["x"] + box["width"] * 0.5, box["y"] + 200)
        scroller.wait_for_timeout(300)

        scroller.evaluate(WATCH_CUTS)
        for _ in range(12):
            scroller.mouse.wheel(0, 220)
            scroller.wait_for_timeout(60)
        for _ in range(12):
            scroller.mouse.wheel(0, -220)
            scroller.wait_for_timeout(60)
        scroller.wait_for_timeout(300)
        scrolled = scroller.evaluate("() => ({ cuts: window.__cuts, frames: window.__frames })")

        # A real hover still has to cut the bars, or the measurement above is of
        # nothing and its zero means nothing.
        scroller.evaluate("() => { window.__cuts = 0; window.__frames = 0; }")
        panel_button(scroller, "Sector", "Water").hover()
        scroller.wait_for_timeout(600)
        hovered = scroller.evaluate("() => ({ cuts: window.__cuts, frames: window.__frames })")
        scroller.close()

        notes.append(
            f"  scrolling with the pointer parked: {scrolled['cuts']} of "
            f"{scrolled['frames']} frames cut; a real hover: {hovered['cuts']} of "
            f"{hovered['frames']}"
        )
        if scrolled["cuts"] > 0:
            problems.append(
                f"scrolling cut the bars on {scrolled['cuts']} of {scrolled['frames']} "
                "frames, so the page is treating a scroll as a pointing gesture"
            )
        if hovered["frames"] and hovered["cuts"] < hovered["frames"] * 0.5:
            problems.append(
                "a real hover did not cut the bars, so the check above proves nothing"
            )

        # ------------------------------------------------------ 9 at 390
        narrow = browser.new_page(viewport={"width": NARROW, "height": 844})
        narrow.goto(URL)
        ready(narrow)
        open_table(narrow)

        scroll_width = narrow.evaluate("() => document.documentElement.scrollWidth")
        notes.append(f"  [390] document scrollWidth {scroll_width}")
        if scroll_width > NARROW:
            problems.append(
                f"[390] the page scrolls horizontally: scrollWidth {scroll_width} against {NARROW}"
            )

        rows = narrow.evaluate(COUNTRY_ROWS)
        truncated = [r["name"] for r in rows if r["truncated"]]
        notes.append(f"  [390] {len(truncated)} country names truncated")
        if truncated:
            problems.append(f"[390] country names truncated: {', '.join(truncated[:4])}")

        small = narrow.evaluate(
            """
            (min) => {
              const out = [];
              for (const b of document.querySelectorAll('button')) {
                const r = b.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) continue;
                if (r.height < min || r.width < min) out.push({ h: Math.round(r.height), w: Math.round(r.width), t: b.textContent.trim().slice(0, 24) });
              }
              return out;
            }
            """,
            MIN_TARGET_PX,
        )
        notes.append(f"  [390] {len(small)} controls under {MIN_TARGET_PX}px, table opened")
        for s in small[:6]:
            problems.append(f"[390] control under {MIN_TARGET_PX}px: {s['w']}x{s['h']} \"{s['t']}\"")

        narrow.screenshot(
            path=os.path.join(ROOT, "tests", "screenshots", "corpus-390.png"), full_page=False
        )
        narrow.close()
        browser.close()

    print("")
    if problems:
        print(f"FAIL: {len(problems)} problem(s)")
        for p in problems:
            print("  " + p)
    else:
        print("PASS: no problems found")
    print("")
    for n in notes:
        print(n)
    print("")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
