"""
Homepage check against the copy file.

  python tests/homepage.py

Asserts that every string in content/home.json that the homepage is supposed to
render is actually on the page, captures full page screenshots at 1440 and 390
wide, and reports horizontal overflow and overlapping text.

content/home.json is a verbatim transcription of docs/website content.md, so
asserting against it is asserting against the copy.
"""

import json
import os
import sys
import re

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "http://localhost:3000/"
SHOTS = os.path.join(ROOT, "tests", "screenshots")

# Strings that are specifications or conditional UI states, not homepage prose.
# They live in the content file for the components that will need them.
NOT_RENDERED = {
    "corpus.emptyState",
    "outputs.emptyState",
    "events.emptyState",
    "events.eventCardFields",
    "collaborate.confirmation",
}

# The form field names are one middot separated line in the copy but have to become
# individual labels on the form. Each part is asserted separately instead.
SPLIT_ON_MIDDOT = {"collaborate.formFields"}

SECTION_IDS = [
    "hero",
    "studies",
    "cases",
    "objectives",
    "corpus",
    "roadmap",
    "outputs",
    "events",
    "team",
    "collaborate",
    "footer",
]


def leaves(node, path=""):
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from leaves(v, f"{path}[{i}]")
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from leaves(v, f"{path}.{k}" if path else k)


def normalise(s):
    return re.sub(r"\s+", " ", s).strip()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    with open(os.path.join(ROOT, "content", "home.json"), encoding="utf-8") as f:
        copy = json.load(f)

    problems = []
    notes = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for width, height, label in [(1440, 900, "1440"), (390, 844, "390")]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto(URL)
            page.wait_for_load_state("networkidle")
            # The Next dev indicator floats over the page and lands in screenshots.
            page.add_style_tag(content="nextjs-portal { display: none !important; }")

            body_text = normalise(page.inner_text("body"))

            # 1. every section present
            for sid in SECTION_IDS:
                if page.locator(f"#{sid}").count() == 0:
                    problems.append(f"[{label}] section #{sid} is missing")

            # 2. the globe block is a full viewport height and empty
            globe = page.locator("#globe")
            if globe.count() == 0:
                problems.append(f"[{label}] the globe block is missing")
            else:
                box = globe.bounding_box()
                if box is None:
                    problems.append(f"[{label}] the globe block has no box")
                else:
                    if abs(box["height"] - height) > 2:
                        problems.append(
                            f"[{label}] globe block height {box['height']:.0f} is not the viewport height {height}"
                        )
                    if normalise(globe.inner_text()) != "":
                        problems.append(f"[{label}] the globe block is not empty")

            # 3. every renderable copy string is on the page
            for path, text in leaves(copy):
                if path in NOT_RENDERED:
                    continue
                if path.endswith(".href"):
                    continue  # a destination, not copy
                if path == "nav.skipLink":
                    continue  # visually hidden until focused, checked separately below
                if path == "nav.primaryLabel":
                    continue  # the accessible name of the nav landmark, not visible text
                if path in SPLIT_ON_MIDDOT:
                    for part in [p_.strip() for p_ in text.split("·") if p_.strip()]:
                        if part not in body_text:
                            problems.append(f"[{label}] copy missing from page: {path} part {part!r}")
                    continue
                if normalise(text) not in body_text:
                    problems.append(f"[{label}] copy missing from page: {path}")

            # 3b. the skip link is first in tab order and targets a real element
            first_focus = page.evaluate(
                """() => {
                    const el = document.querySelector('a, button, input, select, textarea, [tabindex]');
                    return el ? { tag: el.tagName.toLowerCase(), text: (el.textContent||'').trim(), href: el.getAttribute('href') } : null;
                }"""
            )
            if not first_focus:
                problems.append(f"[{label}] no focusable element found")
            else:
                if first_focus["text"] != copy["nav"]["skipLink"]:
                    problems.append(
                        f"[{label}] first focusable element is {first_focus['text']!r}, not the skip link"
                    )
                target = (first_focus.get("href") or "").lstrip("#")
                if not target or page.locator(f"#{target}").count() == 0:
                    problems.append(f"[{label}] the skip link target #{target} does not exist")

            # 3c. every link has a destination that is either a real route or a real anchor
            for link in page.evaluate(
                """() => [...document.querySelectorAll('a[href]')].map(a => ({
                    href: a.getAttribute('href'), text: (a.textContent||'').trim() }))"""
            ):
                href = link["href"]
                if href.startswith("/#") or href.startswith("#"):
                    frag = href.split("#", 1)[1]
                    if page.locator(f"#{frag}").count() == 0:
                        problems.append(
                            f"[{label}] link {link['text']!r} points at #{frag}, which is not on the page"
                        )
                elif href.startswith("/"):
                    notes.append(f"[{label}] route link {link['text']!r} goes to {href}")

            # 4. no motion
            animated = page.evaluate(
                """() => [...document.querySelectorAll('*')].filter(el => {
                    const s = getComputedStyle(el);
                    return (s.transitionDuration !== '0s' && s.transitionDuration !== '')
                        || (s.animationName !== 'none' && s.animationName !== '');
                }).length"""
            )
            if animated:
                problems.append(f"[{label}] {animated} element(s) declare a transition or animation")

            # 5. horizontal overflow
            overflow = page.evaluate(
                """(w) => {
                    const out = [];
                    for (const el of document.querySelectorAll('body *')) {
                        const r = el.getBoundingClientRect();
                        if (r.width === 0 || r.height === 0) continue;
                        if (r.right > w + 1 || r.left < -1) {
                            out.push({
                                tag: el.tagName.toLowerCase(),
                                id: el.id || null,
                                cls: (el.className && String(el.className).slice(0, 60)) || null,
                                left: Math.round(r.left),
                                right: Math.round(r.right),
                                text: (el.textContent || '').trim().slice(0, 60)
                            });
                        }
                    }
                    return out.slice(0, 20);
                }""",
                width,
            )
            doc_scroll = page.evaluate("document.documentElement.scrollWidth")
            if doc_scroll > width + 1:
                problems.append(
                    f"[{label}] page scrolls horizontally: scrollWidth {doc_scroll} against viewport {width}"
                )
            for o in overflow:
                problems.append(
                    f"[{label}] overflows viewport: <{o['tag']}> "
                    f"{o['id'] or o['cls'] or ''} left={o['left']} right={o['right']} :: {o['text']}"
                )

            # 6. overlapping text blocks
            overlaps = page.evaluate(
                """() => {
                    const sel = 'p, h1, h2, h3, dt, dd, li, label, span';
                    const els = [...document.querySelectorAll(sel)].filter(el => {
                        if (el.querySelector(sel)) return false;          // leaf text only
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && (el.textContent || '').trim().length > 0;
                    });
                    const hits = [];
                    for (let i = 0; i < els.length; i++) {
                        for (let j = i + 1; j < els.length; j++) {
                            const a = els[i].getBoundingClientRect();
                            const b = els[j].getBoundingClientRect();
                            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                            const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                            if (ox > 2 && oy > 2) {
                                hits.push({
                                    a: (els[i].textContent || '').trim().slice(0, 40),
                                    b: (els[j].textContent || '').trim().slice(0, 40),
                                    ox: Math.round(ox), oy: Math.round(oy)
                                });
                            }
                        }
                    }
                    return hits.slice(0, 15);
                }"""
            )
            for o in overlaps:
                problems.append(
                    f"[{label}] text overlaps by {o['ox']}x{o['oy']}px: "
                    f"{o['a']!r} and {o['b']!r}"
                )

            # 7. tap target size on the narrow viewport
            if width == 390:
                small = page.evaluate(
                    """() => [...document.querySelectorAll('a, button, input, textarea, select')]
                        .map(el => { const r = el.getBoundingClientRect();
                            return { tag: el.tagName.toLowerCase(), h: Math.round(r.height), w: Math.round(r.width) }; })
                        .filter(x => x.h > 0 && x.h < 44)"""
                )
                for s in small:
                    notes.append(f"[390] tap target under 44px: <{s['tag']}> {s['w']}x{s['h']}")

            shot = os.path.join(SHOTS, f"home-{label}.png")
            page.screenshot(path=shot, full_page=True)
            page_height = page.evaluate("document.documentElement.scrollHeight")
            notes.append(f"[{label}] full page height {page_height}px, screenshot {shot}")

            page.close()

        browser.close()

    print("")
    if problems:
        print(f"FAIL: {len(problems)} problem(s)")
        for p_ in problems:
            print("  " + p_)
    else:
        print("PASS: no problems found")

    print("")
    for n in notes:
        print("  " + n)
    print("")

    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
