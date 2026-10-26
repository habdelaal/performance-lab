/* R056 versioned click relay. Theme-owned; GTM embeds this same source for
 * destination-page receipt. No DOM replay, navigation delay or conversion synthesis.
 * Delivery means at-most-once dataLayer dispatch, NOT analytics server receipt. */
(function (w, d) {
    'use strict';
    const NAME = 'LFThemeClickRelayV1';
    if (w[NAME]) return;
    const VERSION = 'lf-click-v1', TTL = 300000, MAX = 50;
    const EVENTS = ['quote_request', 'freight_search', 'view_route', 'request_booking'];
    let revision = 0;
    let owner = false, stopped = false, busy = false, receiverReady = false;
    let config, readPolicy, memory = { pending: [], sent: [] }, storageKey;
    const state = { captured: 0, dispatched: 0, storageFailed: false };
    function admitted(p) {
        return p && p.enabled === true && p.consent === 'granted' &&
            p.websiteId === config.websiteId && p.environment === 'staging' &&
            p.gtm === config.gtm && p.eventContract === VERSION &&
            p.public === true && p.editable === false;
    }
    function fresh(item) {
        return item && typeof item.id === 'string' && /^[a-f0-9-]{36}$/.test(item.id) &&
            Number.isFinite(item.at) && item.at <= Date.now() && Date.now() - item.at < TTL;
    }
    function valid(item) {
        return fresh(item) && EVENTS.includes(item.name) &&
            typeof item.path === 'string' && /^\/[a-zA-Z0-9_/-]{0,160}$/.test(item.path);
    }
    function load() {
        try {
            const raw = w.sessionStorage.getItem(storageKey);
            if (raw) {
                const data = JSON.parse(raw);
                memory = { pending: (Array.isArray(data.pending) ? data.pending : []).filter(valid).slice(-MAX),
                    sent: (Array.isArray(data.sent) ? data.sent : []).filter(fresh).slice(-MAX * 4) };
            }
        } catch (_) { state.storageFailed = true; }
        memory.pending = memory.pending.filter(valid);
        memory.sent = memory.sent.filter(fresh);
    }
    function persist() {
        try { w.sessionStorage.setItem(storageKey, JSON.stringify(memory)); }
        catch (_) { state.storageFailed = true; }
    }
    function clear() {
        memory = { pending: [], sent: [] };
        try { w.sessionStorage.removeItem(storageKey); } catch (_) { state.storageFailed = true; }
    }
    function setup(c) {
        if (!c || c.websiteId !== 1 || c.environment !== 'staging' ||
            c.gtm !== 'GTM-KR27QMCH' || c.eventContract !== VERSION ||
            !/^livefreight-staging(?:-40312490-dev)?\.odoo\.com$/.test(w.location.hostname)) return false;
        if (config && (config.websiteId !== c.websiteId || config.gtm !== c.gtm)) return false;
        config = c; storageKey = 'lf.theme.click.v1.' + c.websiteId + '.' + c.gtm;
        return true;
    }
    function flush() {
        if (busy || stopped || !receiverReady || !admitted(readPolicy && readPolicy())) return;
        if (w.dataLayer === undefined) w.dataLayer = [];
        if (!Array.isArray(w.dataLayer)) return;
        busy = true;
        try {
            load();
            while (memory.pending.length && admitted(readPolicy())) {
                const event = memory.pending.shift();
                if (memory.sent.some(x => x.id === event.id)) continue;
                // Claim before dispatch. Do not retry an ambiguous vendor outcome.
                memory.sent.push({ id: event.id, at: event.at });
                memory.sent = memory.sent.slice(-MAX * 4); persist();
                w.dataLayer.push({ event: 'lf_theme_click_v1', lf_event_name: event.name,
                    lf_event_id: event.id, lf_source_location: w.location.origin + event.path });
                state.dispatched++;
            }
            persist();
        } finally { busy = false; }
    }
    function click(e) {
        if (!e.isTrusted || stopped || !admitted(readPolicy())) return;
        const el = e.target && e.target.closest && e.target.closest('a,button');
        if (!el || el.disabled) return;
        const names = [];
        if (el.tagName === 'A') {
            const href = el.getAttribute('href') || '';
            // Match the reviewed GTM substring contract; never store full href/query.
            if (href.includes('/shipping-request')) names.push('quote_request');
        }
        const text = el.textContent || '';
        for (const [label, name] of [['Search Freight', 'freight_search'], ['View Route', 'view_route'], ['Request Booking', 'request_booking']]) {
            if (text.includes(label)) names.push(name);
        }
        if (!names.length || !/^\/[a-zA-Z0-9_/-]{0,160}$/.test(w.location.pathname)) return;
        load();
        for (const name of names) {
            if (memory.pending.length >= MAX) break;
            memory.pending.push({ id: w.crypto.randomUUID(), at: Date.now(), name, path: w.location.pathname });
            state.captured++;
        }
        persist(); flush();
    }
    function attach(c, policyReader) {
        if (stopped) return false;
        if (owner) return true;
        if (!setup(c) || typeof policyReader !== 'function' || !admitted(policyReader())) return false;
        readPolicy = policyReader;
        // Verify persistence before taking ownership; no hidden in-memory-only success.
        load(); persist();
        if (state.storageFailed) return false;
        owner = true; w.lfThemeClickOwner = VERSION;
        d.addEventListener('click', click, true);
        return true;
    }
    async function receive(c) {
        if (!setup(c) || stopped) return false;
        const ownRevision = revision;
        const ownPolicyReader = readPolicy;
        try {
            const response = await w.fetch('/lf-theme/tracking-policy', { credentials: 'same-origin', cache: 'no-store' });
            if (!response.ok) throw new Error('Policy unavailable');
            const p = await response.json();
            if (stopped || ownRevision !== revision) return false;
            if (!admitted(p)) { clear(); return false; }
            // Source retains its live reader for withdrawal/revalidation handling.
            if (!ownPolicyReader) readPolicy = () => p;
            receiverReady = true; flush(); return true;
        } catch (_) { return false; }
    }
    function pause() {
        revision++; receiverReady = false;
        if (storageKey) clear();
    }
    function stop() {
        stopped = true; pause();
        d.removeEventListener('click', click, true);
        // Keep ownership marker: falling back to native tags after denial is unsafe.
    }
    d.addEventListener('optionalCookiesDenied', pause);
    w[NAME] = Object.freeze({ attach, receive, stop, pause,
        status: () => ({ ...state, owner, stopped, receiverReady, pending: memory.pending.length }) });
})(window, document);
