#!/usr/bin/env python3
"""Assemble the DRAFTI single-file web app.

Reads the source parts from src/ and writes one self-contained HTML file
(inline CSS and JS, no dependencies, no build step needed to play) to
web/index.html.

Usage: python3 build_web.py   (from the repository root, or anywhere)
"""
import os, pathlib, time, hashlib, json, re

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
        ("/*__CINEMA_STYLES__*/", "cinematic_preview.css"),
        ("/*__CEREMONY_FLAG_DATA__*/", "ceremony_flags.data.js"),
        ("/*__CEREMONY_FLAGS__*/", "ceremony_flags.js"),
        ("/*__CINEMA_DIRECTOR__*/", "cinematic_director.js"),
        ("/*__CINEMA__*/", "cinematic_preview.js"),
    ):
        replacement = part(filename)
        assert token in html, f"missing {token} in template"
        html = html.replace(token, replacement, 1)

    assert "__STYLES__" not in html and "__ENGINE__" not in html and "__UI__" not in html \
        and "__AUDIO__" not in html
    sw = part('sw.template.js')
    streamer_count = sync_streamer_vocabulary()
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
    if streamer_count:
        print(f"synced streamer vocabulary ({streamer_count} verified clips)")


def sync_streamer_vocabulary() -> int:
    source_root = ROOT / 'streamer-pack'
    source_manifest_path = source_root / 'manifest.json'
    if not source_manifest_path.exists():
        return 0
    manifest = json.loads(source_manifest_path.read_text(encoding='utf-8'))
    clips = manifest.get('clips')
    if not isinstance(clips, list) or manifest.get('total') != len(clips):
        raise ValueError('invalid streamer-pack manifest totals')
    counts = {'female': 0, 'male': 0, 'funny': 0}
    ids = set()
    public_clips = []
    total_bytes = 0
    output_root = ROOT / 'web' / 'streamer-vocabulary'
    for clip in clips:
        clip_id = clip.get('id', '')
        mode = clip.get('mode')
        if not re.fullmatch(r's[fjm]2_\d{3}', clip_id) or clip_id in ids:
            raise ValueError(f'invalid or duplicate streamer clip ID: {clip_id}')
        if mode not in counts:
            raise ValueError(f'invalid streamer mode for {clip_id}')
        ids.add(clip_id)
        counts[mode] += 1
        duration = clip.get('durationSec', 0)
        size = clip.get('bytes', 0)
        if not (0 < duration <= 6) or not (0 < size <= 60 * 1024):
            raise ValueError(f'streamer clip exceeds duration or size limits: {clip_id}')
        source_file = (source_root / clip.get('file', '')).resolve()
        try:
            source_file.relative_to(source_root.resolve())
        except ValueError as error:
            raise ValueError(f'streamer clip path escapes its pack: {clip_id}') from error
        content = source_file.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        if len(content) != size or digest != clip.get('sha256'):
            raise ValueError(f'streamer source does not match manifest: {clip_id}')
        atomic_write_bytes(output_root / f'{clip_id}.mp3', content)
        public_clip = dict(clip)
        public_clip['file'] = f'{clip_id}.mp3'
        public_clips.append(public_clip)
        total_bytes += len(content)
    for mode, count in counts.items():
        if manifest.get('counts', {}).get(mode) != count:
            raise ValueError(f'streamer per-mode count mismatch: {mode}')
    if manifest.get('totalBytes') != total_bytes:
        raise ValueError('streamer total byte count mismatch')
    atomic_write(output_root / 'manifest.json', json.dumps(js_json_compatible(public_clips), ensure_ascii=False, indent=2) + '\n')
    return len(clips)


def js_json_compatible(value):
    """Match JSON.stringify's integer formatting for reproducible web builds."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, list):
        return [js_json_compatible(item) for item in value]
    if isinstance(value, dict):
        return {key: js_json_compatible(item) for key, item in value.items()}
    return value


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


def atomic_write_bytes(target: pathlib.Path, content: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + f'.{os.getpid()}.tmp')
    try:
        temporary.write_bytes(content)
        for attempt in range(20):
            try:
                temporary.replace(target)
                break
            except OSError:
                if attempt == 19:
                    raise
                time.sleep(.1)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
