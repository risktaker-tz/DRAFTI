#!/usr/bin/env python3
"""Search the Internet Archive for sound-effect candidates.

Prints identifier / title / license / candidate audio files per query.
Writes results to /home/z/my-project/scripts/sfx_archive.json
"""
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
OUT = pathlib.Path("/home/z/my-project/scripts/sfx_archive.json")

QUERIES = [
    "sad trombone",
    "slide whistle",
    "boing sound effect",
    "crowd gasp",
    "record scratch",
    "kazoo",
    "bulb horn",
    "lion roar",
    "eagle call",
    "elephant trumpet",
    "rimshot",
    "wilhelm scream",
    "cartoon sound effects",
]


def get(url: str) -> dict | bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read()
    return json.loads(data.decode("utf-8", "replace"))


def search(term: str) -> list:
    qs = urllib.parse.urlencode({
        "q": f'"{term}" AND mediatype:audio',
        "fl[]": ["identifier", "title", "licenseurl", "downloads"],
        "sort[]": "-downloads",
        "rows": "6",
        "output": "json",
    })
    # urlencode mangles the list into repeated params? do it manually:
    q = ('https://archive.org/advancedsearch.php?q=' + urllib.parse.quote(
        f'"{term}" AND mediatype:audio') +
        '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=licenseurl&fl%5B%5D=downloads'
        '&sort%5B%5D=-downloads&rows=6&output=json')
    data = get(q)
    docs = (data.get("response") or {}).get("docs") or []
    return docs


def files_of(identifier: str) -> list:
    data = get(f"https://archive.org/metadata/{identifier}")
    out = []
    for f in data.get("files") or []:
        name = f.get("name", "")
        fmt = (f.get("format") or "").lower()
        if not any(k in fmt for k in ("mp3", "ogg", "wav", "flac", "m4a")):
            continue
        out.append({
            "file": name,
            "format": fmt,
            "size": int(f.get("size") or 0),
            "length": f.get("length"),
        })
    lic = (data.get("metadata") or {}).get("licenseurl", "")
    return [{"licenseurl": lic, "files": out[:12]}]


def main() -> None:
    terms = sys.argv[1:] or QUERIES
    all_results = {}
    for t in terms:
        try:
            docs = search(t)
            print(f"\n### {t}")
            for d in docs:
                ident = d["identifier"]
                print(f"  {ident}  [{d.get('licenseurl') or 'no-license-field'}]  "
                      f"dl={d.get('downloads')}")
            all_results[t] = docs
        except Exception as e:  # noqa: BLE001
            print(f"\n### {t} FAILED: {e}")
        time.sleep(2)
    OUT.write_text(json.dumps(all_results, indent=1))
    print(f"\nsaved -> {OUT}")


if __name__ == "__main__":
    main()
