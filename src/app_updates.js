// Fetch installed-app updates silently; never reload an active match.
(() => {
  const allowed = location.protocol === 'https:' || location.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!allowed || !navigator.serviceWorker) return;
  const build = document.querySelector('meta[name="drafti-build"]')?.content;
  let pending = false, reloading = false, lastCheck = -Infinity;
  let lastController = navigator.serviceWorker.controller;
  globalThis.DRAFTI_UPDATE = {
    applyAtMatchBoundary() {
      if (reloading) return true;
      if (!pending) return false;
      reloading = true;
      try { location.reload(); return true; }
      catch { reloading = false; return false; }
    },
  };
  const probe = () => {
    const controller = navigator.serviceWorker.controller;
    if (!controller || !build || typeof MessageChannel === 'undefined') return;
    const channel = new MessageChannel();
    const close = () => { channel.port1.close(); channel.port2.close(); };
    const timer = setTimeout(close, 1500);
    channel.port1.onmessage = event => {
      clearTimeout(timer); close();
      if (event.data?.type === 'DRAFTI_BUILD_RESPONSE' &&
          /^[a-f0-9]{64}$/.test(event.data.build) && event.data.build !== build) pending = true;
    };
    try { controller.postMessage({ type: 'DRAFTI_BUILD_REQUEST' }, [channel.port2]); }
    catch { clearTimeout(timer); close(); }
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    lastController = navigator.serviceWorker.controller; probe();
  });
  const registered = Promise.resolve().then(() => navigator.serviceWorker.register('./sw.js', {
    updateViaCache: 'none',
  })).catch(() => null);
  const check = async event => {
    if (document.hidden) return;
    if (event?.persisted || lastController !== navigator.serviceWorker.controller) {
      lastController = navigator.serviceWorker.controller; probe();
    }
    if (Date.now() - lastCheck < 30000) return;
    lastCheck = Date.now();
    const registration = await registered;
    if (registration) try { await registration.update(); } catch { /* offline: keep playing */ }
  };
  addEventListener('pageshow', event => { void check(event); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
})();
