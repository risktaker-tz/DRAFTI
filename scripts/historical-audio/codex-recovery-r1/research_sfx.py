#!/usr/bin/env python3
"""Search Wikimedia Commons for freely-licensed sound effects.

Queries the Commons API (no key needed) for candidate audio files per
search term and prints title / license / duration / size / direct URL.
Writes full results to /home/z/my-project/scripts/sfx_candidates.json.
"""
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
OUT = pathlib.Path("/home/z/my-project/scripts/sfx_candidates.json")

QUERIES = [
    "lion roar",
    "bald eagle call",
    "eagle scream",
    "elephant trumpet",
    "sad trombone",
    "slide whistle",
    "boing",
    "crowd gasp",
    "audience ooh",
    "record scratch",
    "kazoo",
    "bike horn",
    "wilhelm scream",
    "rimshot",
]


def api(params: dict) -> dict:
    base = "https://commons.wikimedia.org/w/api.php"
    qs = urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            req = urllib.request.Request(base + "?" + qs, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (429, 403) and attempt < 2:
                time.sleep(25 * (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def search(term: str) -> list:
    data = api({
        "action": "query", "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:audio {term}",
        "gsrnamespace": "6", "gsrlimit": "8",
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata|mediatype",
    })
    pages = (data.get("query") or {}).get("pages") or {}
    out = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata") or {}
        lic = (meta.get("LicenseShortName") or {}).get("value", "?")
        # duration is reported in seconds (may be string)
        dur = ii.get("duration")
        out.append({
            "term": term,
            "title": p.get("title"),
            "url": ii.get("url"),
            "size": ii.get("size"),
            "duration_s": round(float(dur), 1) if dur else None,
            "license": lic,
            "mime": ii.get("mime"),
        })
    return out


def main() -> None:
    queries = sys.argv[1:] or QUERIES
    results = []
    if OUT.exists():
        results = json.loads(OUT.read_text())
        seen = {r["title"] for r in results}
    else:
        seen = set()
    for q in queries:
        try:
            rows = search(q)
            fresh = [r for r in rows if r["title"] not in seen]
            for r in fresh:
                seen.add(r["title"])
            results.extend(fresh)
            print(f"\n### {q}  ({len(fresh)} new hits)")
            for r in fresh:
                print(f"  {r['license']:<24} {str(r['duration_s']):>6}s "
                      f"{(r['size'] or 0)//1024:>6} KB  {r['title']}")
        except Exception as e:  # noqa: BLE001
            print(f"\n### {q}  FAILED: {e}")
        OUT.write_text(json.dumps(results, indent=1))
        time.sleep(9)
    print(f"\nsaved {len(results)} candidates -> {OUT}")


if __name__ == "__main__":
    main()
