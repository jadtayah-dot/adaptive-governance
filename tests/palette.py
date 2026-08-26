"""
Checks the palette against the rules DESIGN.md states.

  python tests/palette.py

Reads the tokens out of app/globals.css rather than repeating them, so the
check and the site cannot drift apart. Needs no browser and no dev server.

Three rules, all from DESIGN.md:

  1. Text colours clear 4.5:1 on both the base and the raised surface. Rules and
     dividers clear 3:1 on both, which is WCAG 1.4.11 for non text contrast.
  2. Every polygon fill, from the thinnest country to the thickest, clears 3:1
     against the page. On the previous dark ground this was expressed as a
     minimum alpha; on a light ground alpha is the wrong axis, because a blue
     over white goes under 3:1 long before it stops being visible, so the scale
     is a walk between two solid colours and both ends are checked here.
  3. The two globe colours stay far apart under simulated deuteranopia and
     protanopia. Colour is never the only channel separating them, but it is one
     of them, and a pair that collapses for a dichromat is a pair that fails.

The dichromat simulation is the Vienot 1999 transform through LMS, and the
distance is plain CIE76 in Lab. Both are approximations and both are the ones
the original palette was checked with, so the numbers stay comparable.
"""

import math
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, "app", "globals.css")

# Text has to clear this on both surfaces. Non text, which for this site means
# rules and dividers and the polygon fills, has to clear the second.
TEXT_MIN = 4.5
NON_TEXT_MIN = 3.0
# Anything under this and the two globe colours are the same colour to someone
# who cannot tell blue from orange.
DELTA_E_MIN = 15.0


def tokens():
    """Every --ag- custom property in the :root block, as a name to value map."""
    with open(CSS, encoding="utf-8") as f:
        css = f.read()
    root = re.search(r":root\s*\{(.*?)\n\}", css, re.S)
    if not root:
        raise SystemExit("could not find the :root block in app/globals.css")
    return dict(re.findall(r"(--ag-[\w-]+)\s*:\s*([^;]+);", root.group(1)))


def rgb(value):
    h = value.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def channel(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(c):
    r, g, b = (channel(v) for v in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# Vienot 1999, via LMS.
RGB2LMS = [
    [17.8824, 43.5161, 4.11935],
    [3.45565, 27.1554, 3.86714],
    [0.0299566, 0.184309, 1.46709],
]
LMS2RGB = [
    [0.080944, -0.130504, 0.116721],
    [-0.0102485, 0.0540194, -0.113615],
    [-0.000365294, -0.00412163, 0.693513],
]
PROTAN = [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]]
DEUTAN = [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]]


def apply(m, v):
    return [sum(m[i][j] * v[j] for j in range(3)) for i in range(3)]


def simulate(c, kind):
    lms = apply(RGB2LMS, [float(v) for v in c])
    lms = apply(PROTAN if kind == "protan" else DEUTAN, lms)
    out = apply(LMS2RGB, lms)
    return tuple(max(0, min(255, round(v))) for v in out)


def lab(c):
    r, g, b = (channel(v) for v in c)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else (7.787 * t + 16 / 116)
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a, b):
    return math.dist(lab(a), lab(b))


def main():
    t = tokens()
    problems = []
    notes = []

    surface = rgb(t["--ag-surface"])
    raised = rgb(t["--ag-surface-raised"])

    # 1. text and rules against both surfaces
    against = [("surface", surface), ("raised", raised)]
    for name, minimum in [
        ("--ag-ink", TEXT_MIN),
        ("--ag-ink-muted", TEXT_MIN),
        ("--ag-accent", TEXT_MIN),
        ("--ag-accent-dim", NON_TEXT_MIN),
        ("--ag-rule", NON_TEXT_MIN),
    ]:
        c = rgb(t[name])
        ratios = []
        for label, bg in against:
            r = contrast(c, bg)
            ratios.append(f"{label} {r:.2f}:1")
            if r < minimum:
                problems.append(
                    f"{name} is {r:.2f}:1 on the {label}, under the {minimum}:1 it has to clear"
                )
        notes.append(f"  {name:<22} {t[name]:<9} {'   '.join(ratios)}")

    # 2. both ends of the polygon fill scale, against the page
    for name in ("--ag-globe-fill-min", "--ag-globe-fill-max"):
        c = rgb(t[name])
        r = contrast(c, surface)
        notes.append(f"  {name:<22} {t[name]:<9} surface {r:.2f}:1")
        if r < NON_TEXT_MIN:
            problems.append(
                f"{name} is {r:.2f}:1 on the surface, so a country drawn at that "
                f"end of the scale is under the {NON_TEXT_MIN}:1 non text minimum"
            )

    # 2c. The corpus bars walk between those same two ends with color-mix in
    #     sRGB, which is a straight line in gamma encoded channels. Both ends are
    #     checked above; what the bars need on top of that is that no point in
    #     between dips under 3:1 and that the walk never doubles back, because
    #     lightness is what carries the count and a scale that reverses in the
    #     middle reads two counts as the same. Fifty steps, which is finer than
    #     the corpus can produce: 31 studies is the largest bar.
    lo = rgb(t["--ag-globe-fill-min"])
    hi = rgb(t["--ag-globe-fill-max"])
    steps = 50
    walk = []
    for i in range(steps + 1):
        f = i / steps
        walk.append(tuple(round(lo[c] + (hi[c] - lo[c]) * f) for c in range(3)))
    #     The bar is drawn on a track, not on the page, so the track is what it
    #     has to be told apart from. The track is --ag-globe-land for that
    #     reason: on --ag-surface-raised the lightest bar is under 3:1.
    track = rgb(t["--ag-globe-land"])
    worst = min(min(contrast(c, surface) for c in walk), min(contrast(c, track) for c in walk))
    notes.append(
        f"  {'corpus bar walk':<22} {steps} steps  worst {worst:.2f}:1   "
        f"L* {lab(walk[0])[0]:.1f} to {lab(walk[-1])[0]:.1f}"
    )
    if worst < NON_TEXT_MIN:
        problems.append(
            f"a corpus bar somewhere along the fill walk is {worst:.2f}:1 against "
            f"the page or against its track, under the {NON_TEXT_MIN}:1 non text "
            "minimum"
        )
    lightness = [lab(c)[0] for c in walk]
    for i in range(steps):
        if lightness[i + 1] > lightness[i] + 1e-9:
            problems.append(
                "the corpus bar walk is not monotonic in lightness at step "
                f"{i}, so two different counts can be drawn at the same weight"
            )
            break

    # 2b. Land the corpus does not reach is deliberately near the page, so that
    #     lightness rather than hue separates a country holding no studies from
    #     one holding a single study. Its fill is therefore not what has to clear
    #     3:1; its outline is, and the outline is --ag-rule, already checked
    #     above. What does have to hold is the ordering: no data has to be
    #     lighter than every country the corpus reaches, or the scale runs two
    #     ways at once.
    land = rgb(t["--ag-globe-land"])
    lightest = rgb(t["--ag-globe-fill-min"])
    notes.append(
        f"  {'--ag-globe-land':<22} {t['--ag-globe-land']:<9} "
        f"surface {contrast(land, surface):.2f}:1   L* {lab(land)[0]:.1f} "
        f"against the lightest fill L* {lab(lightest)[0]:.1f}"
    )
    if lab(land)[0] <= lab(lightest)[0]:
        problems.append(
            "--ag-globe-land is not lighter than --ag-globe-fill-min, so a country "
            "holding no studies is as dark as one holding a study"
        )
    if lab(land)[0] - lab(lightest)[0] < 15:
        problems.append(
            f"--ag-globe-land is only {lab(land)[0] - lab(lightest)[0]:.1f} L* lighter "
            "than the lightest fill, which is not enough to read as a different "
            "category without relying on hue"
        )

    # 3. the two globe colours, for a dichromat
    a, b = rgb(t["--ag-globe-existing"]), rgb(t["--ag-globe-project"])
    seen = {
        "normal": delta_e(a, b),
        "protanopia": delta_e(simulate(a, "protan"), simulate(b, "protan")),
        "deuteranopia": delta_e(simulate(a, "deutan"), simulate(b, "deutan")),
    }
    notes.append(
        "  globe pair               "
        + "   ".join(f"{k} {v:.0f}" for k, v in seen.items())
    )
    for kind, d in seen.items():
        if d < DELTA_E_MIN:
            problems.append(
                f"the two globe colours are deltaE {d:.0f} apart under {kind}, "
                f"under the {DELTA_E_MIN:.0f} they have to clear"
            )

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
