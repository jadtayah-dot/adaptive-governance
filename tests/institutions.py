"""The partner marks in the footer.

Two things can rot here. The alt text is an institution name that was lifted
verbatim from a partner's role line in content/home.json, so editing that copy
would silently leave the footer asserting a name the site no longer uses. And a
mark can be referenced but missing from public/, which fails as a broken image
rather than as anything a reader could report.

Neither is caught by the other checks, because the copy check reads markdown and
never JSON, and the homepage check does not look at the footer.
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name):
    with open(os.path.join(ROOT, "content", name), encoding="utf-8") as fh:
        return json.load(fh)


def main():
    home = load("home.json")
    institutions = load("institutions.json")

    problems = []
    notes = []

    partners = home["team"]["partners"]
    # The name is the leading sentence of a role line, which is how it was taken.
    leading = {p["role"].split(".")[0].strip(): p["name"] for p in partners}

    for entry in institutions["partners"]:
        name = entry["name"]
        if name not in leading:
            problems.append(
                f"{name!r} is not the leading sentence of any partner role in "
                "home.json, so the footer names an institution the copy does not"
            )
        else:
            notes.append(f"  {name}  <- {leading[name]}")

        path = os.path.join(ROOT, "public", entry["file"].lstrip("/"))
        if not os.path.exists(path):
            problems.append(f"{entry['file']} is referenced but not in public/")
        else:
            kb = os.path.getsize(path) / 1024
            notes.append(f"    {entry['file']}  {kb:.1f} KB  {entry['width']}x{entry['height']}")

    # The row is deliberately unlabelled because it is incomplete. If it ever
    # reaches the full five, that reasoning should be revisited rather than
    # silently inherited.
    named = len(partners)
    shown = len(institutions["partners"])
    notes.append(f"  {shown} of {named} named partners have a mark")
    if shown > named:
        problems.append(
            f"{shown} marks against {named} partners named in the copy, "
            "so the footer shows an institution section nine does not"
        )

    for line in notes:
        print(line)
    for line in problems:
        print(f"FAIL {line}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
