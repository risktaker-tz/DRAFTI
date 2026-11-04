'use strict';
// Run in an isolated copy of the built HTML. Exercises production menu handlers.
if (window.qaPresentation?.running) throw Error('Presentation matrix already running');
const presentationApp = window.__drafti;
if (!presentationApp || presentationApp.state.history.length) throw Error('Use a fresh isolated opening');
window.qaPresentation = { running: true, startedAt: new Date().toISOString(),
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
          report.rows.push({ ruleset, theme: theme.dataset.v, material: material.dataset.v, hv,
            cells: document.querySelectorAll('#board .sq').length,
            boardWidth: board.width, boardHeight: board.height,
            documentWidth: document.documentElement.scrollWidth,
            pieces: pieces.length,
            maxCircleError: Math.max(...pieces.map(disc => {
              const rect = disc.getBoundingClientRect(); return Math.abs(rect.width - rect.height);
            })), ivory: sample('ivory'), ebony: sample('ebony') });
        }
      }
    }
  }
  presentationApp.menu.close();
  report.complete = report.rows.length === 3 * 21 * 8 * 2;
  report.finishedAt = new Date().toISOString();
  report.running = false;
})().catch(error => { window.qaPresentation.running = false; window.qaPresentation.errors.push(String(error)); });
'Started rendered presentation matrix';
