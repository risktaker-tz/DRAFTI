#!/usr/bin/env python3
"""Assemble the DRAFTI single-file web app.

Reads the source parts from src/ and writes one self-contained HTML file
(inline CSS and JS, no dependencies, no build step needed to play) to
web/index.html.

Usage: python3 build_web.py   (from the repository root, or anywhere)
"""
import os, pathlib, time, hashlib

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
        ("/*__AUDIENCE__*/", "audience.js"),
        ("/*__UI__*/", "ui.js"),
        ("/*__UPDATES__*/", "app_updates.js"),
    ):
        replacement = part(filename)
        assert token in html, f"missing {token} in template"
        html = html.replace(token, replacement, 1)

    assert "__STYLES__" not in html and "__ENGINE__" not in html and "__UI__" not in html \
        and "__AUDIO__" not in html
    sw = part('sw.template.js')
    stamp = hashlib.sha256(html.encode('utf-8'))
    stamp.update(('\0sw\0' + sw).encode('utf-8'))
    for name in ('manifest.webmanifest','icon.svg','icon-192.png','icon-512.png',
                 'streamer-vocabulary/manifest.json','audience-vibes/manifest.json'):
        filename = ROOT / 'web' / name
        if filename.exists():
            stamp.update(('\0' + name + '\0').encode('utf-8'))
            stamp.update(filename.read_bytes() if name.endswith('.png') else filename.read_text(encoding='utf-8').encode('utf-8'))
    build = stamp.hexdigest()
    html = html.replace('__DRAFTI_BUILD__', build)
    atomic_write(OUT, html)
    atomic_write(ROOT / 'web/sw.js', sw.replace('__DRAFTI_BUILD__', build))
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes)")


def atomic_write(target: pathlib.Path, content: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    # Stable bytes on Windows, Linux, GitHub Pages and Vercel.
    temporary=target.with_name(target.name+f'.{os.getpid()}.tmp')
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as output:
            output.write(content)
        for attempt in range(20):
            try:
                temporary.replace(target)
                break
            except OSError:
                if attempt==19: raise
                time.sleep(.1)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
