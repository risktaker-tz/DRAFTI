#!/usr/bin/env python3
"""One-shot: convert internal '! ' exclamation pauses in FUNNY sentences to
'em-dash' pauses (kazi inserts 0.5-0.7 s silence at '!'). Keeps the final
exclamation. Lowercases the following word for natural flow."""
import pathlib, re

p = pathlib.Path(__file__).resolve().parent / 'sentences.py'
src = p.read_text(encoding='utf8')
start = src.index('FUNNY = [')
end = src.index('def records():')
block = src[start:end]
fixed = re.sub(r'! ([A-Za-z])', lambda m: ' — ' + m.group(1).lower(), block)
src = src[:start] + fixed + src[end:]
src = src.replace("a king is born — applaud!", "a king is born, applaud!")
p.write_text(src, encoding='utf8')
left = len(re.findall(r'! [A-Za-z]', fixed))
print('internal exclamations remaining:', left)
