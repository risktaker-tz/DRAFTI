# Crisp-board pass: the neon palette's soft glows read as "blurred" on phones.
# - every piece gets a hairline dark contour + tighter glow -> sharp discs on
#   any theme
# - squares get a dark seam under the grid line so the grid reads clearly
# - ebony pieces get a subtle top rim so they separate from dark squares
import pathlib

p = pathlib.Path('/home/z/my-project/download/DRAFTI/src/styles.css')
s = p.read_text()

old = """.piece.ivory .body {
  background: radial-gradient(circle at 35% 28%, var(--pl-l-1), var(--pl-l-2) 55%, var(--pl-l-3));
  border: 1px solid var(--pl-l-edge);
  box-shadow: 0 5px 10px rgba(0, 0, 0, .48), 0 1px 2px rgba(0, 0, 0, .5),
              inset 0 2px 3px rgba(255, 255, 255, .4),
              inset 0 -4px 6px rgba(0, 0, 0, .3), 0 0 16px var(--pl-l-glow);
}"""
new = """.piece.ivory .body {
  background: radial-gradient(circle at 35% 28%, var(--pl-l-1), var(--pl-l-2) 55%, var(--pl-l-3));
  border: 1px solid var(--pl-l-edge);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .42), 0 2px 4px rgba(0, 0, 0, .5),
              0 4px 9px rgba(0, 0, 0, .42),
              inset 0 2px 3px rgba(255, 255, 255, .4),
              inset 0 -4px 6px rgba(0, 0, 0, .3), 0 0 8px var(--pl-l-glow);
}"""
assert old in s
s = s.replace(old, new, 1)

old = """.piece.ebony .body {
  background: radial-gradient(circle at 35% 28%, var(--pl-d-1), var(--pl-d-2) 58%, var(--pl-d-3));
  border: 1px solid var(--pl-d-edge);"""
new = """.piece.ebony .body {
  background: radial-gradient(circle at 35% 28%, var(--pl-d-1), var(--pl-d-2) 58%, var(--pl-d-3));
  border: 1px solid var(--pl-d-edge);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .55), 0 0 0 2px rgba(140, 190, 235, .13),
              0 2px 4px rgba(0, 0, 0, .55), 0 4px 9px rgba(0, 0, 0, .45),
              inset 0 1px 2px rgba(190, 220, 255, .16),
              inset 0 -4px 6px rgba(0, 0, 0, .42), 0 0 8px var(--pl-d-glow);
}
.piece.ebony .body {"""
# the original ebony rule continues with its own box-shadow — replace it wholly
old_full = """.piece.ebony .body {
  background: radial-gradient(circle at 35% 28%, var(--pl-d-1), var(--pl-d-2) 58%, var(--pl-d-3));
  border: 1px solid var(--pl-d-edge);
  box-shadow: 0 5px 10px rgba(0, 0, 0, .52), 0 1px 2px rgba(0, 0, 0, .55),
              inset 0 2px 3px rgba(255, 255, 255, .16),
              inset 0 -4px 6px rgba(0, 0, 0, .5), 0 0 16px var(--pl-d-glow);
}"""
new_full = """.piece.ebony .body {
  background: radial-gradient(circle at 35% 28%, var(--pl-d-1), var(--pl-d-2) 58%, var(--pl-d-3));
  border: 1px solid var(--pl-d-edge);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .55), 0 0 0 2px rgba(140, 190, 235, .13),
              0 2px 4px rgba(0, 0, 0, .55), 0 4px 9px rgba(0, 0, 0, .45),
              inset 0 1px 2px rgba(190, 220, 255, .16),
              inset 0 -4px 6px rgba(0, 0, 0, .42), 0 0 8px var(--pl-d-glow);
}"""
assert old_full in s, 'ebony body'
s = s.replace(old_full, new_full, 1)

# squares: dark seam under the grid line for a crisp grid on every theme
old = """.sq.light {
  background: linear-gradient(160deg, var(--sq-light-hi), var(--sq-light) 55%, var(--sq-light-lo));
  box-shadow: inset 0 0 0 1px var(--grid-line), inset 0 1px 0 rgba(255, 255, 255, .09),
              inset 0 0 14px rgba(255, 255, 255, .045);
}"""
new = """.sq.light {
  background: linear-gradient(160deg, var(--sq-light-hi), var(--sq-light) 55%, var(--sq-light-lo));
  box-shadow: inset 0 0 0 1px var(--grid-line), inset 0 0 0 2px rgba(0, 0, 0, .16),
              inset 0 1px 0 rgba(255, 255, 255, .09);
}"""
assert old in s
s = s.replace(old, new, 1)

old = """.sq.dark {
  background: linear-gradient(160deg, var(--sq-dark-hi), var(--sq-dark) 55%, var(--sq-dark-lo));
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--grid-line), inset 0 1px 0 rgba(255, 255, 255, .03),
              inset 0 -6px 14px rgba(0, 0, 0, .18);
}"""
new = """.sq.dark {
  background: linear-gradient(160deg, var(--sq-dark-hi), var(--sq-dark) 55%, var(--sq-dark-lo));
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--grid-line), inset 0 0 0 2px rgba(0, 0, 0, .2),
              inset 0 1px 0 rgba(255, 255, 255, .03),
              inset 0 -4px 9px rgba(0, 0, 0, .16);
}"""
assert old in s
s = s.replace(old, new, 1)

# neon base: darken dark squares a touch so ebony pieces separate
p2 = pathlib.Path('/home/z/my-project/download/DRAFTI/src/ui.js')
u = p2.read_text()
old = "    '--sq-dark-hi': '#16293e', '--sq-dark': '#112238', '--sq-dark-lo': '#0c1a2e',"
new = "    '--sq-dark-hi': '#132436', '--sq-dark': '#0d1b2c', '--sq-dark-lo': '#081320',"
assert old in u
u = u.replace(old, new, 1)
p2.write_text(u)

p.write_text(s)
print('crisp-board pass applied')
