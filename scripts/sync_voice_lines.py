#!/usr/bin/env python3
"""Refresh the current streamer transcript inventory from its shipped manifest."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LINES = ROOT / 'scripts' / 'voice_lines.md'
MANIFEST = ROOT / 'web' / 'streamer-vocabulary' / 'manifest.json'
START = '<!-- BEGIN CURRENT STREAMER VOCABULARY INVENTORY -->'
END = '<!-- END CURRENT STREAMER VOCABULARY INVENTORY -->'


def markdown(value):
    return ' '.join(str(value).replace('|', '\\|').split())


def main():
    rows = json.loads(MANIFEST.read_text(encoding='utf-8'))
    ids = [row['id'] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate IDs in streamer vocabulary manifest')
    modes = sorted({row['mode'] for row in rows})
    counts = {mode: sum(row['mode'] == mode for row in rows) for mode in modes}
    section = [
        START,
        '',
        '## Current streamer vocabulary (synchronized from the shipped manifest)',
        '',
        f"Current entries: {len(rows)} — " + ', '.join(f'{mode}: {counts[mode]}' for mode in modes) + '.',
        'The manifest is the source of truth for each ID, voice, and exact spoken text.',
        '',
        '| name | voice | exact text |',
        '| --- | --- | --- |',
    ]
    for row in rows:
        voice = f"{row['mode']} / {row['voice']}"
        section.append(f"| {markdown(row['id'])} | {markdown(voice)} | {markdown(row['text'])} |")
    section.extend(['', END])
    current = LINES.read_text(encoding='utf-8')
    start = current.find(START)
    end = current.find(END)
    if (start >= 0) != (end >= 0) or (start >= 0 and end < start):
        raise ValueError('Voice inventory markers are damaged; refusing to overwrite the file')
    if start >= 0:
        end += len(END)
        updated = current[:start] + '\n'.join(section) + current[end:]
    else:
        updated = current.rstrip() + '\n\n' + '\n'.join(section) + '\n'
    LINES.write_text(updated, encoding='utf-8', newline='\n')
    print(f"Synchronized {len(rows)} streamer transcripts: {', '.join(f'{mode}={counts[mode]}' for mode in modes)}")


if __name__ == '__main__':
    main()
