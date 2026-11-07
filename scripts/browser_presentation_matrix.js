'use strict';
// Run in an isolated copy of the built HTML. Exercises production menu handlers.
if (window.qaPresentation?.running) throw Error('Presentation matrix already running');
const presentationApp = window.__drafti;
if (!presentationApp || presentationApp.state.history.length) throw Error('Use a fresh isolated opening');
window.qaPresentation = { running: true, startedAt: new Date().toISOString(),
  buildId: document.querySelector('meta[name="drafti-build"]')?.content || null,
  viewport: { width: innerWidth, height: innerHeight }, rows: [], errors: [],
  scope: 'Rendered opening geometry and computed styles across all themes, materials, board sizes and high-visibility states. Does not certify visual contrast, flags, kings or event animations.' };
(async () => {
  const report = window.qaPresentation;
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  presentationApp.menu.open();
  for (const ruleset of ['eastafrica8', 'eastafrica10', 'eastafrica12']) {
    document.querySelector('.east-africa-rule[data-v="' + ruleset + '"]').click();
    await new Promise(resolve => setTimeout(resolve, 400));
    for (const theme of document.querySelectorAll('.theme-sw')) {
      theme.click();
      for (const material of document.querySelectorAll('#segPieces button')) {
        material.click();
        for (const hv of [false, true]) {
          if (presentationApp.settings.hv !== hv) document.querySelector('#btnHV').click();
          await frame();
          const pieces = [...document.querySelectorAll('#pieces .piece .body')];
          const board = document.querySelector('#board').getBoundingClientRect();
          const sample = side => {
            const disc = document.querySelector('#pieces .piece.' + side + ' .body');
            const style = getComputedStyle(disc), rect = disc.getBoundingClientRect();
            return { width: rect.width, height: rect.height, background: style.backgroundImage,
              border: style.border, shadow: style.boxShadow, radius: style.borderRadius };
          };
          const squarePaint = type => {
            const square = document.querySelector('#board .sq.' + type);
            const style = getComputedStyle(square);
            return { backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage,
              border: style.border, boxShadow: style.boxShadow };
          };
          report.rows.push({ ruleset, theme: theme.dataset.v, material: material.dataset.v, hv,
            cells: document.querySelectorAll('#board .sq').length,
            boardWidth: board.width, boardHeight: board.height,
            documentWidth: document.documentElement.scrollWidth,
            pieces: pieces.length,
            maxPieceCellError: Math.max(...[...document.querySelectorAll('#pieces > .piece')].map(piece => {
              const sq = Number(piece.dataset.square), cell = document.querySelectorAll('#board .sq')[sq];
              if (!Number.isInteger(sq) || !cell) return Infinity;
              const a = piece.getBoundingClientRect(), b = cell.getBoundingClientRect();
              return Math.max(Math.abs(a.left - b.left), Math.abs(a.top - b.top),
                Math.abs(a.width - b.width), Math.abs(a.height - b.height));
            })),
            maxCircleError: Math.max(...pieces.map(disc => {
              const rect = disc.getBoundingClientRect(); return Math.abs(rect.width - rect.height);
            })), lightSquare: squarePaint('light'), darkSquare: squarePaint('dark'),
            ivory: sample('ivory'), ebony: sample('ebony') });
        }
      }
    }
  }
  presentationApp.menu.close();
  report.complete = report.rows.length === 3 * 21 * 8 * 2;
  report.scope = 'Rendered opening geometry, exact piece-to-square alignment and computed piece/square paints across all themes, materials, board sizes and high-visibility states. Paint data enables targeted contrast analysis but is not pixel-level whole-disc, flag, king or animation proof.';
  report.finishedAt = new Date().toISOString();
  report.running = false;
})().catch(error => { window.qaPresentation.running = false; window.qaPresentation.errors.push(String(error)); });
'Started rendered presentation matrix';
