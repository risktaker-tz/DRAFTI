#!/usr/bin/env python3
"""Assemble the DRAFTI single-file web app.

Reads the source parts from src/ and writes one self-contained HTML file
(inline CSS and JS, no dependencies, no build step needed to play) to
web/index.html.

Usage: python3 build_web.py   (from the repository root, or anywhere)
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "web" / "index.html"


def part(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


def main() -> None:
    html = part("index.template.html")
    for token, filename in (
        ("/*__STYLES__*/", "styles.css"),
        ("/*__AUDIO__*/", "audio.manifest.js"),
        ("/*__ENGINE__*/", "engine.js"),
        ("/*__UI__*/", "ui.js"),
    ):
        replacement = part(filename)
        assert token in html, f"missing {token} in template"
        html = html.replace(token, replacement, 1)

    assert "__STYLES__" not in html and "__ENGINE__" not in html and "__UI__" not in html \
        and "__AUDIO__" not in html
    OUT.parent.mkdir(parents=True, exist_ok=True)
    # Stable bytes on Windows, Linux, GitHub Pages and Vercel.
    with OUT.open("w", encoding="utf-8", newline="\n") as output:
        output.write(html)
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
