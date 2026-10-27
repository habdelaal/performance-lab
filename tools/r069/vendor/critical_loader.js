/* R069 standalone inline bootstrap; no Odoo or third-party dependency. */
(() => {
    'use strict';
    const script = document.currentScript;
    const url = script && script.getAttribute('data-css-url');
    if (!url || document.getElementById('lf-critical-full')) return;
    const link = document.createElement('link');
    link.id = 'lf-critical-full';
    link.rel = 'stylesheet';
    link.media = 'print';
    let started = false, loaded = false, retried = false;
    const state = value => { document.documentElement.dataset.lfCriticalState = value; };
    const full = () => { link.media = 'all'; state(loaded ? 'full' : 'fallback-loading'); };
    link.onload = () => {
        loaded = true;
        full();
        // Keep the earlier subset in its original cascade position. The complete
        // sheet follows it, avoiding a font/style gap during media changes.
    };
    link.onerror = () => {
        full();
        if (!retried) {
            retried = true;
            link.removeAttribute('href');
            link.href = url;
        } else state('full-error');
    };
    const start = () => {
        if (started) return;
        started = true;
        link.href = url;
        state('loading');
    };
    script.before(link);
    state('critical');
    // The timer also handles hidden tabs where animation frames may be paused.
    setTimeout(start, 150);
    setTimeout(() => { if (!loaded) { start(); full(); } }, 4000);
    try { requestAnimationFrame(() => requestAnimationFrame(start)); }
    catch (_) { start(); full(); }
})();
