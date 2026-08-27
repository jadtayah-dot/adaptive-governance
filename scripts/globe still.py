"""
Renders the three globe frames served below MIN_LIVE_WIDTH.

  npm run dev
  python "scripts/globe still.py"

Writes public/globe-still-whole.png, -separated.png and -descended.png.

They are screenshots of the real scene at three points in the argument: the
whole sphere with countries raised and lit by record count, the dissection with
both shells out, and the descent over Doha with the extrusion flat, Qatar
outlined and empty, and the five work package nodes up. Where they are taken
from is STILL_FRAMES in lib/globe-sequence.ts, read out of that file here rather
than repeated, so the pictures and the sequence cannot disagree about what
"separated" means.

It used to be one frame of the end state, which is not a quieter version of the
argument. The move it is built on, the globe coming apart and then being
descended into, was absent, and a reader below the live width was told what the
layers were and never shown them.

None of these is drawn by hand and none may be, or the picture the small screen
path shows will drift away from the corpus the wide path shows. Regenerate them
whenever the corpus or the globe changes and commit the result.

The page cooperates through `?globe=still&frame=<id>`, which holds the sequence
at that frame's position and lifts the scene over the rest of the page so the
screenshot has nothing else in it.
"""

import hashlib
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
URL = "http://localhost:3000/?globe=still&frame={frame}"


def frames():
    """
    The frames, with where each is taken from and how much of it is kept, read
    out of lib/globe-sequence.ts.

    They live there because the page needs them too. Repeating the list here is
    how the renderer and the page come to disagree about which frame is which,
    so it is parsed instead.
    """
    path = os.path.join(ROOT, "lib", "globe-sequence.ts")
    with open(path, encoding="utf-8") as f:
        src = f.read()

    block = re.search(r"STILL_FRAMES\s*=\s*\[(.*?)\n\]", src, re.S)
    if not block:
        raise SystemExit("could not find STILL_FRAMES in lib/globe-sequence.ts")
    found = re.findall(
        r"id:\s*'([a-z]+)'\s*,\s*at:\s*([\d.]+)\s*,\s*crop:\s*(\d+)", block.group(1)
    )
    if not found:
        raise SystemExit("STILL_FRAMES in lib/globe-sequence.ts parsed as empty")

    size = re.search(r"STILL_RENDER\s*=\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)", src)
    if not size:
        raise SystemExit("could not find STILL_RENDER in lib/globe-sequence.ts")

    return (
        [(fid, float(at), int(crop)) for fid, at, crop in found],
        (int(size.group(1)), int(size.group(2))),
    )


def out_path(frame_id):
    return os.path.join(PUBLIC, f"globe-still-{frame_id}.png")

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

# How long to wait before capturing. The scene has to build its geometry, take
# the camera where the frame asks and bring the shells or the nodes in on top of
# that. globe.gl gives no ready signal past the first frame, so this waits
# rather than guesses.

# The scene has to build its geometry, take the camera to Doha and bring the
# nodes up before there is anything worth capturing. globe.gl gives no ready
# signal past the first frame, so this waits rather than guesses.
SETTLE_MS = 6000


def main():
    wanted, (render_w, render_h) = frames()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": render_w, "height": render_h})

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        os.makedirs(PUBLIC, exist_ok=True)
        written = []

        for frame_id, at, crop in wanted:
            url = URL.format(frame=frame_id)
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception as e:
                print(f"could not reach {url}. Is npm run dev running?\n{e}")
                browser.close()
                return 1

            # The dev server draws its own indicator over the page and it is
            # inside the capture box. The host element is in the light dom, so
            # hiding it here is enough and next.config.ts does not have to
            # change.
            page.add_style_tag(content="nextjs-portal { display: none !important; }")

            stage = page.locator("[data-globe-still]")
            try:
                stage.wait_for(state="visible", timeout=15000)
                page.locator("[data-globe-still] canvas").wait_for(state="attached", timeout=15000)
            except Exception as e:
                print(f"the capture layer never appeared for {frame_id}: {e}")
                browser.close()
                return 1

            page.wait_for_timeout(SETTLE_MS)

            path = out_path(frame_id)
            if crop > 0:
                page.screenshot(
                    path=path,
                    clip={
                        "x": (render_w - crop) / 2,
                        "y": (render_h - crop) / 2,
                        "width": crop,
                        "height": crop,
                    },
                )
            else:
                page.screenshot(path=path)
            written.append((frame_id, at, crop, path))

        browser.close()

        if errors:
            print("page errors during capture:")
            for e in errors:
                print(f"  {e}")
            return 1

    with open(STAMP, "w", encoding="utf-8", newline="\n") as f:
        json.dump(
            {"sources": source_hashes(), "frames": [fid for fid, _, _ in wanted]},
            f,
            indent=2,
        )
        f.write("\n")

    for frame_id, at, crop, path in written:
        size_kb = os.path.getsize(path) / 1024
        shape = f"{crop}x{crop}" if crop else f"{render_w}x{render_h}"
        print(f"wrote {os.path.relpath(path, ROOT)}  at {at}  {shape}  {size_kb:.0f} KB")
    print(f"wrote {os.path.relpath(STAMP, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
