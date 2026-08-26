"""
Contrast check for ordinary page copy, against whatever is actually behind it.

  npm run dev
  python "tests/page contrast.py"

The globe sits behind the whole page now, and the page itself is a gradient
rather than a flat white. Neither of those is visible to a check that compares a
text token with a surface token, because the ground under a line of copy is no
longer a token: it is the gradient at that scroll position, plus whatever the
globe is drawing behind it, at whatever strength the globe has there.

tests/palette.py carries the analytic side of this. It composites the darkest
colour the globe can draw at BACKGROUND_OPACITY over the darkest stop of the
gradient and requires every text token to clear 4.5:1 against that, which bounds
the whole page while the globe is a wash.

This is the empirical side, and it exists for the case the bound does not cover:
the approach. The globe gains strength over the last stretch of it, and for the
rest of the approach there is still corpus prose on screen above the argument
container. STRENGTH_FROM in lib/globe-sequence.ts is what keeps those two apart,
and this is what says whether it is far enough.

Method is the same as tests/globe contrast.py. Every visible run of copy is
measured, the glyphs are made transparent, the viewport is screenshotted, the
PNG is handed back into the page and drawn to a 2D canvas, and every pixel
inside each box is read. The globe is a WebGL canvas without
preserveDrawingBuffer, so reading the compositor output back is the only way to
see what is really behind the text.

Fails on anything under 4.5:1.
"""

import base64
import os
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "http://localhost:3000/"
WIDTHS = [(1440, 900), (1920, 1080)]
TEXT_MIN = 4.5

# Where to look. The approach and the departure are sampled finely because that
# is where copy and a strengthening globe can meet; the rest of the page is
# sampled coarsely, since the bound in tests/palette.py already covers a globe
# holding at BACKGROUND_OPACITY and this is only confirming it.
FINE_STEP = 0.15   # of a viewport height
COARSE_STEP = 1.4  # of a viewport height


def constant(name):
    """Read a number out of lib/globe-sequence.ts rather than repeating it."""
    with open(os.path.join(ROOT, "lib", "globe-sequence.ts"), encoding="utf-8") as f:
        m = re.search(rf"{name}\s*=\s*([\d.]+)", f.read())
    if not m:
        raise SystemExit(f"could not find {name} in lib/globe-sequence.ts")
    return float(m.group(1))


GEOM = """() => {
  const s = document.querySelector('.sticky');
  if (!s) return null;
  const c = s.parentElement.getBoundingClientRect();
  return {
    top: Math.round(c.top + window.scrollY),
    bottom: Math.round(c.bottom + window.scrollY),
    page: document.documentElement.scrollHeight,
  };
}"""

# Every run of copy on screen, with the colour it is painted in and the exact
# rectangles its lines occupy.
#
# Line rectangles, from a Range over the text node, rather than the element box.
# The element box includes its own padding and border, and a first pass measured
# the grid rules through it: --ag-rule is legitimately dark, it is nowhere near a
# glyph, and reading it as the ground under the text called four of the five
# worst cases on the page. What a reader contrasts a letter against is what is
# immediately behind that letter.
BOXES = r"""() => {
  const out = [];
  const vw = window.innerWidth, vh = window.innerHeight;
  const sel = 'h1,h2,h3,h4,p,a,li,span,label,dt,dd,button,td,th,figcaption';
  const range = document.createRange();
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    // Anything mid fade is not what a reader settles on, and its own opacity
    // would have to be folded in. The passages are measured by their own check.
    let o = 1, p = el;
    while (p && p !== document.body) { o *= Number(getComputedStyle(p).opacity); p = p.parentElement; }
    if (o < 0.95) continue;
    const m = cs.color.match(/rgba?\(([^)]+)\)/);
    if (!m) continue;
    const c = m[1].split(',').map(Number);
    if (c.length > 3 && c[3] < 0.95) continue;

    const rects = [];
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 2 || r.height < 2) continue;
        if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
        rects.push({ left: r.left, top: r.top, width: r.width, height: r.height });
      }
    }
    if (!rects.length) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      text: el.textContent.trim().slice(0, 34),
      color: c.slice(0, 3),
      fontSize: parseFloat(cs.fontSize) || 12,
      rects,
    });
  }
  return out;
}"""

# Worst ratio over every pixel inside each box, against that box's own colour.
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

  const out = [];
  for (const b of boxes) {
    const fg = lum(b.color[0], b.color[1], b.color[2]);
    let ratio = Infinity, at = null;
    for (const rect of b.rects) {
      /*
        The band the glyphs actually occupy, not the line box.

        A line rectangle is the line height, which is 1.65 here, so it stands
        well clear of the letters at top and bottom and in a tight row it
        reaches the divider above or below. A first pass measured --ag-rule
        through it and reported the corpus country index as failing, which it is
        not: a rule beside a line of text is not the ground behind it.
      */
      const band = Math.max(2, (rect.height - b.fontSize) / 2 + 1);
      const x0 = Math.max(0, Math.round((rect.left + 1) * dpr));
      const y0 = Math.max(0, Math.round((rect.top + band) * dpr));
      const w = Math.min(cv.width - x0, Math.round((rect.width - 2) * dpr));
      const h = Math.min(cv.height - y0, Math.round((rect.height - band * 2) * dpr));
      if (w < 1 || h < 1) continue;
      const d = ctx.getImageData(x0, y0, w, h).data;
      /*
        The worst colour that actually covers the band, not the worst pixel.

        A one pixel divider crossing a narrow box is a tenth of it, is high
        contrast, and is not the ground the glyphs sit on. Taking the worst
        single pixel reported the corpus country index as failing at exactly ink
        against --ag-rule, which is a rule beside a number rather than behind
        it, and no reader has ever had trouble with it.

        So colours are counted, and only those covering at least SHARE of the
        band are eligible. A background that genuinely threatens legibility
        covers the text; a hairline does not. Two tone grounds still work,
        because both tones clear the share.
      */
      const SHARE = 0.15;
      const counts = new Map();
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        // Quantised to five bits a channel, so antialiasing does not split one
        // background into a thousand near identical colours.
        const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        counts.set(key, (counts.get(key) || 0) + 1);
        n++;
      }
      if (!n) continue;
      for (const [key, count] of counts) {
        if (count < n * SHARE) continue;
        const r8 = ((key >> 10) & 31) << 3, g8 = ((key >> 5) & 31) << 3, b8 = (key & 31) << 3;
        const l = lum(r8, g8, b8);
        const r = (Math.max(fg, l) + 0.05) / (Math.min(fg, l) + 0.05);
        if (r < ratio) { ratio = r; at = [r8, g8, b8]; }
      }
    }
    if (at === null) continue;
    out.push({ tag: b.tag, text: b.text, color: b.color,
               ratio: Number(ratio.toFixed(2)), behind: at });
  }
  return out;
}"""

HIDE = """() => {
  let s = document.getElementById('contrast-probe');
  if (!s) {
    s = document.createElement('style');
    s.id = 'contrast-probe';
    // Colour only. Layout has to stay exactly where it was measured.
    s.textContent = '*{color:transparent !important;}';
    document.head.appendChild(s);
  }
  s.disabled = false;
}"""

SHOW = "() => { const s = document.getElementById('contrast-probe'); if (s) s.disabled = true; }"


def settle(page, y):
    for _ in range(60):
        page.evaluate("(t) => window.scrollTo(0, t)", y)
        page.wait_for_timeout(90)
        if abs(page.evaluate("() => Math.round(window.scrollY)") - y) < 3:
            return True
    return False


def positions(geom, vh):
    """Fine through the approach and the departure, coarse everywhere else."""
    fine = int(FINE_STEP * vh)
    coarse = int(COARSE_STEP * vh)
    out = set()
    # The approach: one viewport height before the container top reaches the top.
    for y in range(max(0, geom["top"] - 2 * vh), geom["top"] + 1, fine):
        out.add(max(0, y))
    # The departure: one viewport height after the container bottom passes.
    for y in range(geom["bottom"] - 2 * vh, min(geom["page"] - vh, geom["bottom"] + vh), fine):
        out.add(max(0, y))
    # The rest of the page, coarsely.
    for y in range(0, geom["page"] - vh, coarse):
        out.add(y)
    return sorted(y for y in out if 0 <= y <= geom["page"] - vh)


def main():
    problems = []
    notes = []
    notes.append(
        "  BACKGROUND_OPACITY {}, strength rise {} to {}px, fall over {}px".format(
            constant("BACKGROUND_OPACITY"),
            constant("STRENGTH_RISE_FROM"),
            constant("STRENGTH_RISE_TO"),
            constant("STRENGTH_FALL_OVER"),
        )
    )

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, h in WIDTHS:
            page = browser.new_page(viewport={"width": w, "height": h})
            page.goto(URL, wait_until="networkidle")
            page.add_style_tag(content="nextjs-portal { display: none !important; }")
            page.wait_for_timeout(2500)

            geom = page.evaluate(GEOM)
            if geom is None:
                problems.append(f"[{w}] could not find the argument container")
                page.close()
                continue

            ys = positions(geom, h)
            notes.append(f"  [{w}] {len(ys)} scroll positions, page {geom['page']}px")

            worst = {"ratio": 999.0}
            for y in ys:
                settle(page, y)
                boxes = page.evaluate(BOXES)
                if not boxes:
                    continue
                page.evaluate(HIDE)
                page.wait_for_timeout(60)
                shot = "data:image/png;base64," + base64.b64encode(page.screenshot()).decode()
                page.evaluate(SHOW)
                rows = page.evaluate(SAMPLE, [shot, boxes])
                for r in rows:
                    if r["ratio"] < worst["ratio"]:
                        worst = {**r, "y": y}
                    if r["ratio"] < TEXT_MIN:
                        problems.append(
                            f"[{w}] at scroll {y}, <{r['tag']}> is {r['ratio']}:1 against "
                            f"rgb{tuple(r['behind'])} behind it: {r['text']!r}"
                        )
            if worst["ratio"] < 999:
                notes.append(
                    f"  [{w}] worst {worst['ratio']}:1 at scroll {worst['y']}, "
                    f"<{worst['tag']}> {worst['text']!r} on rgb{tuple(worst['behind'])}"
                )
            page.close()
        browser.close()

    print("")
    if problems:
        # One line per position is enough to find it; the rest is noise.
        seen = set()
        trimmed = []
        for line in problems:
            key = line.split(", <")[0]
            if key in seen:
                continue
            seen.add(key)
            trimmed.append(line)
        print(f"FAIL: {len(problems)} run(s) of copy under {TEXT_MIN}:1, at {len(trimmed)} position(s)")
        for line in trimmed[:12]:
            print("  " + line)
    else:
        print(f"PASS: every run of copy clears {TEXT_MIN}:1 against what is behind it")
    print("")
    for n in notes:
        print(n)
    print("")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
