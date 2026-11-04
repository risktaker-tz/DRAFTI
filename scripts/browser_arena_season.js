'use strict';
// Observe normal arena play; never manufacture moves, results or ladder levels.
if (window.qaArenaSeason?.running) throw Error('Arena observation already running');
const arenaApp = window.__drafti;
if (!arenaApp || arenaApp.state.mode !== 'aivai' || !arenaApp.settings.aivaiAuto) {
  throw Error('Select AI vs AI with automatic rematches before starting this observer');
}
window.qaArenaSeason = {
  running: true, startedAt: new Date().toISOString(),
  source: location.href, speed: arenaApp.state.aiSpeed,
  openingSeason: arenaApp.state.arenaSeason, openingBout: arenaApp.state.arenaBout,
  games: [], errors: [], observations: []
};
window.addEventListener('error', event => window.qaArenaSeason.errors.push(event.message));
window.addEventListener('unhandledrejection', event => window.qaArenaSeason.errors.push(String(event.reason)));
(async () => {
  const log = window.qaArenaSeason;
  let priorGame = '', priorResult = '';
  while (log.games.length < 12 && Date.now() - Date.parse(log.startedAt) < 7200000) {
    const state = arenaApp.state;
    const key = state.arenaSeason + ':' + state.arenaBout;
    if (key !== priorGame) {
      priorGame = key;
      log.observations.push({ event: 'bout-start', season: state.arenaSeason,
        bout: state.arenaBout, seats: [state.seatIvory, state.seatEbony],
        levels: [state.diffIvory, state.diffEbony], at: Date.now() });
    }
    if (state.over && key !== priorResult) {
      priorResult = key;
      log.games.push({ season: state.arenaSeason, bout: state.arenaBout,
        seats: [state.seatIvory, state.seatEbony], levels: [state.diffIvory, state.diffEbony],
        plies: state.history.length, result: state.result, at: Date.now() });
      sessionStorage.setItem('drafti.qa.arena-season', JSON.stringify(log));
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  log.running = false;
  log.complete = log.games.length === 12;
  log.finishedAt = new Date().toISOString();
  sessionStorage.setItem('drafti.qa.arena-season', JSON.stringify(log));
})().catch(error => { window.qaArenaSeason.running = false; window.qaArenaSeason.errors.push(String(error)); });
'Started observation of twelve real arena bouts';
