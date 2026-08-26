"""
Contrast check for the globe sequence passages.

  npm run dev
  python "tests/globe contrast.py"

The passages sit on the globe with no panel behind them. That is deliberate:
contrast is met by placing each one where the sphere is not at that moment, and
a scrim heavy enough to carry ink over a lit polygon would take the globe with
it. Placement is therefore load bearing, and a passage moved by a few percent,
a copy edit that adds a line, or a change to the camera track can all quietly
put text over brass. None of that is visible in a diff.

So this measures it. At each point in the sequence it screenshots the viewport
with the passages hidden, hands the PNG back into the page as a data URL, draws
it to a 2D canvas and reads every pixel behind each passage box. The globe is a
WebGL canvas without preserveDrawingBuffer, so reading the compositor output
back is the only way to see what is actually behind the text.

Reports the worst case per passage: the pixel behind it that the ink colour
contrasts with least, and that ratio. Which end of the range is dangerous
depends on whether the site is light or dark, so this takes the worst over every
pixel rather than assuming a direction. Fails on anything under 4.5:1.
"""

import base64
import sys

from playwright.sync_api import sync_playwright

URL = "http://localhost:3000/"
POINTS = [0.10, 0.20, 0.30, 0.42, 0.55, 0.70, 0.80, 0.95]
WIDTHS = [(1440, 900), (1920, 1080)]

GEOM = """() => {
  const s = document.querySelector('.sticky');
  if (!s) return null;
  const c = s.parentElement.getBoundingClientRect();
  return { start: Math.round(c.top + window.scrollY),
           end: Math.round(c.bottom + window.scrollY - window.innerHeight) };
}"""

BOXES = r"""() => {
  const out = [];
  for (const el of document.querySelectorAll('[data-passage]')) {
    if (Number(getComputedStyle(el).opacity) < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // A passage on an opaque card is read against the card, not against
    // whatever the globe is doing behind it. Anything less than opaque and the
    // globe is what decides, so the pixels are sampled instead.
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    const parts = m ? m[1].split(',').map(Number) : [];
    const opaque = parts.length >= 3 && (parts.length < 4 || parts[3] >= 0.999);
    out.push({ key: el.dataset.passage, backing: opaque ? parts.slice(0, 3) : null,
               left: r.left, top: r.top, width: r.width, height: r.height });
  }
  return out;
}"""

# Brightest pixel inside each passage box. The text itself is hidden for the
# screenshot, so what is measured is only what sits behind it.
SAMPLE = r"""async ([shot, boxes]) => {
  const img = new Image();
  await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = shot; });
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const dpr = img.width / window.innerWidth;

  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ag-ink').trim();
  const m = ink.replace('#', '').match(/.{2}/g).map((h) => parseInt(h, 16));
  const inkLum = lum(m[0], m[1], m[2]);

  const out = [];
  for (const b of boxes) {
    if (b.backing) {
      const l = lum(b.backing[0], b.backing[1], b.backing[2]);
      const ratio = (Math.max(inkLum, l) + 0.05) / (Math.min(inkLum, l) + 0.05);
      out.push({ key: b.key, ratio: Number(ratio.toFixed(2)), behind: b.backing, on: 'card' });
      continue;
    }
    // A little margin, because a glyph sitting one pixel outside the box would
    // still be read against whatever is there.
    const pad = 4;
    const x0 = Math.max(0, Math.floor((b.left - pad) * dpr));
    const y0 = Math.max(0, Math.floor((b.top - pad) * dpr));
    const w = Math.min(cv.width - x0, Math.ceil((b.width + pad * 2) * dpr));
    const h = Math.min(cv.height - y0, Math.ceil((b.height + pad * 2) * dpr));
    if (w < 1 || h < 1) continue;
    const d = ctx.getImageData(x0, y0, w, h).data;
    /*
      The worst ratio over every pixel, not the brightest pixel. Which end is
      dangerous depends on the scheme: dark text is killed by anything dark
      behind it and light text by anything light, and this file should not have
      to know which one the site is on today.
    */
    let ratio = Infinity, at = null;
    for (let i = 0; i < d.length; i += 4) {
      const l = lum(d[i], d[i + 1], d[i + 2]);
      const r = (Math.max(inkLum, l) + 0.05) / (Math.min(inkLum, l) + 0.05);
      if (r < ratio) { ratio = r; at = [d[i], d[i + 1], d[i + 2]]; }
    }
    out.push({ key: b.key, ratio: Number(ratio.toFixed(2)), behind: at, on: 'globe' });
  }
  return out;
}"""


def settle(page, y):
    for _ in range(80):
        page.evaluate("(t) => window.scrollTo(0, t)", y)
        page.wait_for_timeout(110)
        if abs(page.evaluate("() => Math.round(window.scrollY)") - y) < 3:
            return
    return


def main():
    worst_overall = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, h in WIDTHS:
            page = browser.new_page(viewport={"width": w, "height": h})
            page.goto(URL, wait_until="networkidle")
            page.add_style_tag(content="nextjs-portal { display: none !important; }")
            page.wait_for_timeout(3000)
            g = page.evaluate(GEOM)
            if not g:
                print(f"[{w}] no pinned container")
                page.close()
                continue
            for pt in POINTS:
                settle(page, round(g["start"] + (g["end"] - g["start"]) * pt))
                page.wait_for_timeout(900)
                boxes = page.evaluate(BOXES)
                if not boxes:
                    print(f"[{w}] {pt:.2f}      (no passage on screen)")
                    continue
                # Take the text out for the capture, so the sample is background.
                page.evaluate(
                    "() => { const o = document.querySelector('[data-passage]')"
                    ".closest('.fixed'); o.dataset.hidden = '1';"
                    " o.style.visibility = 'hidden'; }"
                )
                page.wait_for_timeout(120)
                shot = page.screenshot(timeout=90000, animations="allow")
                page.evaluate(
                    "() => { const o = document.querySelector('[data-passage]')"
                    ".closest('.fixed'); o.style.visibility = ''; }"
                )
                data = "data:image/png;base64," + base64.b64encode(shot).decode()
                rows = page.evaluate(SAMPLE, [data, boxes])
                for r in rows:
                    flag = "FAIL" if r["ratio"] < 4.5 else "ok  "
                    if r["ratio"] < 4.5:
                        worst_overall.append((w, pt, r))
                    print(
                        f"[{w}] {pt:.2f} {flag} {r['key']:<9} {r['ratio']:>6}:1  "
                        f"on the {r.get('on', 'globe'):<5} rgb{tuple(r['behind'] or ())}"
                    )
            page.close()
        browser.close()
    print("")
    print(f"{len(worst_overall)} passage frame(s) under 4.5:1")
    return 1 if worst_overall else 0


if __name__ == "__main__":
    sys.exit(main())
