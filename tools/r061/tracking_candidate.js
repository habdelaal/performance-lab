/* R053 opt-in controller: only the admitted theme document loads its bundle.
 * A per-website server/consent adapter must call create explicitly.
 * This is a loader, not a consent manager or a guarantee of analytics delivery.
 */
(function (w, d) {
    'use strict';
    const key = Symbol.for('lf.theme.tracking.candidate');
    if (w[key]) return;
    let instance;
    function create(config, readPolicy) {
        if (instance) throw new Error('Tracking candidate already created');
        if (!config || !Number.isInteger(config.websiteId) || config.websiteId < 1 ||
            config.environment !== 'staging' || typeof readPolicy !== 'function' ||
            !/^GTM-[A-Z0-9]+$/.test(config.gtm || '') || !/^\d+$/.test(config.meta || '')) {
            throw new Error('Invalid per-website candidate configuration');
        }
        const websiteId = config.websiteId, gtm = config.gtm, meta = config.meta;
        const states = { google: 'waiting', meta: 'waiting' };
        const nodes = [], listeners = [];
        let timer = null, stopped = false, started = false, reloadRequired = false;
        let reason = '', queued = 0;
        function policy() {
            let p;
            try { p = readPolicy(); } catch (_) { return null; }
            if (!p || p.websiteId !== websiteId || p.environment !== 'staging' ||
                p.fullShell !== true || p.public !== true || p.editable !== false ||
                p.conversion !== false || p.legacyLoadersRemoved !== true ||
                p.consent !== 'granted' || !p.exclusions ||
                typeof p.exclusions.google !== 'boolean' ||
                typeof p.exclusions.meta !== 'boolean' ||
                typeof p.exclusions.clarity !== 'boolean') return null;
            return p;
        }
        function allowed(provider, p) {
            if (!p) return false;
            // Clarity is inside GTM: do not mistake the draft exception for live policy.
            if (provider === 'google') return !p.exclusions.google &&
                !p.exclusions.clarity && p.publishedContainerReviewed === true;
            return !p.exclusions.meta;
        }
        function conflict() {
            if (w.google_tag_manager || w.fbq || w._fbq || w.freightAdsTracking) return true;
            if (Array.isArray(w.dataLayer) && w.dataLayer.some(x => x && x.event === 'gtm.js')) return true;
            return Array.from(d.scripts).some(s => /googletagmanager\.com\/(gtm\.js|gtag\/js)|connect\.facebook\.net\//.test(s.src || ''));
        }
        function clearSchedule() {
            if (timer !== null) w.clearTimeout(timer);
            timer = null;
            for (const [target, name, fn] of listeners) target.removeEventListener(name, fn);
            listeners.length = 0;
        }
        function listen(target, name, fn) {
            target.addEventListener(name, fn, { passive: true });
            listeners.push([target, name, fn]);
        }
        function inject(provider, url) {
            const script = d.createElement('script');
            script.async = true; script.src = url;
            script.dataset.lfTrackingCandidate = provider;
            states[provider] = 'loading'; nodes.push(script);
            script.onload = () => {
                if (!stopped) states[provider] = 'script_loaded';
            };
            script.onerror = () => {
                if (!stopped) states[provider] = 'failed';
                // No implicit retry: a loaded provider can already have emitted events.
            };
            d.head.appendChild(script);
        }
        function start() {
            if (stopped || started) return;
            clearSchedule();
            const p = policy();
            if (!p) { reason = 'policy_not_admitted'; return; }
            if (conflict()) { reason = 'existing_loader'; return; }
            if (w.dataLayer !== undefined && !Array.isArray(w.dataLayer)) {
                reason = 'invalid_data_layer'; return;
            }
            started = true;
            if (allowed('google', p)) {
                w.dataLayer = w.dataLayer || [];
                // Existing queued application events retain their original order.
                w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
                inject('google', 'https://www.googletagmanager.com/gtm.js?id=' + gtm);
            } else states.google = 'excluded';
            if (allowed('meta', p)) {
                const fbq = function () {
                    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
                    else fbq.queue.push(arguments);
                };
                fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
                w.fbq = fbq; w._fbq = fbq;
                fbq('init', meta); fbq('track', 'PageView');
                inject('meta', 'https://connect.facebook.net/en_US/fbevents.js');
            } else states.meta = 'excluded';
        }
        function schedule() {
            if (stopped || started) return;
            clearSchedule();
            if (!policy()) { reason = 'policy_not_admitted'; return; }
            reason = '';
            // Explicit baseline for the next experiment: 1500ms after load OR
            // first pointer/key interaction. No arbitrary 20-second silent delay.
            const afterLoad = () => {
                if (timer === null) timer = w.setTimeout(start, 1500);
            };
            listen(w, 'pointerdown', start); listen(w, 'keydown', start);
            if (d.readyState === 'complete') afterLoad();
            else listen(w, 'load', afterLoad);
        }
        instance = Object.freeze({
            schedule,
            start,
            pause() { clearSchedule(); },
            queueEvent(eventName) {
                const p = policy();
                // Only the reviewed context signal is accepted. No generic PII or
                // fabricated conversion/click replay through this prototype API.
                if (stopped || queued >= 100 || eventName !== 'lf_theme_tracking_context' ||
                    !allowed('google', p) || (!started && conflict())) return false;
                if (w.dataLayer !== undefined && !Array.isArray(w.dataLayer)) return false;
                w.dataLayer = w.dataLayer || [];
                w.dataLayer.push({ event: eventName, lf_website_id: websiteId });
                queued++; return true;
            },
            stop() {
                stopped = true; clearSchedule();
                reloadRequired = nodes.length > 0;
                for (const node of nodes) { node.onload = node.onerror = null; node.remove(); }
                // Removing a script does NOT revoke consent or unload its runtime.
                // The integration must perform native revocation and reload as needed.
                states.google = states.meta = 'stopped';
            },
            status() { return { ...states, started, stopped, reloadRequired, reason, queued }; },
        });
        return instance;
    }
    w[key] = Object.freeze({ create });
})(window, document);
