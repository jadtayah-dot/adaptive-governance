"""
Renders the globe still served below MIN_LIVE_WIDTH.

  npm run dev
  python "scripts/globe still.py"

Writes public/globe-still.png.

The still is a screenshot of the real scene at the last frame of the argument:
the camera over Doha, the polygons flat and lit by record count, Qatar outlined
and empty, and the five work package nodes up. It is not drawn by hand, and it
must not be, or the picture the small screen path shows will drift away from the
corpus the wide path shows. Regenerate it whenever the corpus or the globe
changes and commit the result.

The page cooperates through `?globe=still`, which holds the sequence at progress
1, centres the sphere in the canvas rather than offsetting it right for a column
of prose that is not there, and lifts the scene over the rest of the page so the
screenshot has nothing else in it.
"""

import hashlib
import json
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "globe-still.png")
URL = "http://localhost:3000/?globe=still"

# Written next to this script and read by "scripts/check globe still.mjs",
# which fails the build when the corpus has moved on and the still has not.
# Hashes rather than timestamps: git does not preserve modification times, so a
# fresh clone would compare two checkout times in an arbitrary order.
STAMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "globe still.stamp.json")
SOURCES = [
    os.path.join("content", "corpus.json"),
    os.path.join("content", "corpus by country.json"),
]


def source_hashes():
    """
    What the still was rendered from, as content hashes.

    Line endings are normalised first, because git hands these files out with
    CRLF on a machine configured for Windows and LF everywhere else, and the
    question being asked is whether the corpus changed, not who cloned it.
    "scripts/check globe still.mjs" normalises the same way.
    """
    out = {}
    for rel in SOURCES:
        with open(os.path.join(ROOT, rel), "rb") as f:
            data = f.read().replace(b"\r\n", b"\n")
        out[rel.replace("\\", "/")] = hashlib.sha256(data).hexdigest()
    return out

# Render square, then keep the middle of it. globe.gl frames by field of view,
# so a larger canvas buys pixels rather than reach, and the only way to get the
# subject bigger in the frame is to keep less of the frame. The still is served
# at about a third of the width the live scene has, and uncropped, Qatar comes
# out around fifteen pixels on a phone and the outline that the whole descent is
# built around cannot be seen. The crop is centred on the camera target, which
# is Doha, so it is still the scene rather than a composition.
SIZE = 1400
CROP = 880

# The scene has to build its geometry, take the camera to Doha and bring the
# nodes up before there is anything worth capturing. globe.gl gives no ready
# signal past the first frame, so this waits rather than guesses.
SETTLE_MS = 6000


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": SIZE, "height": SIZE})

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        try:
            page.goto(URL, wait_until="networkidle", timeout=30000)
        except Exception as e:
            print(f"could not reach {URL}. Is npm run dev running?\n{e}")
            return 1

        # The dev server draws its own indicator over the page and it is inside
        # the capture box. The host element is in the light dom, so hiding it
        # here is enough and next.config.ts does not have to change.
        page.add_style_tag(content="nextjs-portal { display: none !important; }")

        stage = page.locator("[data-globe-still]")
        try:
            stage.wait_for(state="visible", timeout=15000)
            page.locator("[data-globe-still] canvas").wait_for(state="attached", timeout=15000)
        except Exception as e:
            print(f"the capture layer never appeared: {e}")
            browser.close()
            return 1

        page.wait_for_timeout(SETTLE_MS)

        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        inset = (SIZE - CROP) / 2
        page.screenshot(
            path=OUT,
            clip={"x": inset, "y": inset, "width": CROP, "height": CROP},
        )
        browser.close()

        if errors:
            print("page errors during capture:")
            for e in errors:
                print(f"  {e}")
            return 1

    with open(STAMP, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"sources": source_hashes()}, f, indent=2)
        f.write("\n")

    size_kb = os.path.getsize(OUT) / 1024
    print(f"wrote {os.path.relpath(OUT, ROOT)}  {CROP}x{CROP}  {size_kb:.0f} KB")
    print(f"wrote {os.path.relpath(STAMP, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
