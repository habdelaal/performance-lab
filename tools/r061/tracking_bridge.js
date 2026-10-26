/* Shared full-shell adapter. No page-specific loader or consent inference. */
(function (w, d) {
    'use strict';
    const key = Symbol.for('lf.theme.tracking.bridge');
    const node = d.getElementById('lf-theme-tracking-policy');
    const factory = w[Symbol.for('lf.theme.tracking.candidate')];
    if (!node || !factory || w[key]) return;
    let initial;
    try { initial = JSON.parse(node.textContent); } catch (_) { return; }
    if (!initial || initial.enabled !== true || initial.consentSource !== 'odoo_optional_cookie_decision') return;
    let policy = initial, revision = 0, withdrawn = false;
    const controller = factory.create(initial, () => policy);
    function publishConsent(state) {
        // Reviewed GTM consent template must consume this state with its consent
        // APIs. This signal alone is NOT proof all container tags honor consent.
        if (w.dataLayer === undefined) w.dataLayer = [];
        if (!Array.isArray(w.dataLayer)) return;
        w.dataLayer.push({ event: 'lf_theme_tracking_consent', lf_optional_storage: state });
        if (typeof w.fbq === 'function') w.fbq('consent', state === 'granted' ? 'grant' : 'revoke');
        if (typeof w.clarity === 'function') w.clarity('consentv2', {
            ad_Storage: state, analytics_Storage: state,
        });
    }
    function deny() {
        revision++;
        withdrawn = controller.status().started;
        policy = { ...policy, consent: 'denied' };
        if (w.LFThemeClickRelayV1) {
            if (withdrawn) w.LFThemeClickRelayV1.stop();
            else w.LFThemeClickRelayV1.pause();
        }
        publishConsent('denied');
        if (withdrawn) controller.stop();
        else controller.pause();
        // Do not reload a user's unfinished form or claim removal unloads a vendor.
        d.dispatchEvent(new w.CustomEvent('lf-theme-tracking-stopped', {
            detail: { reloadRequired: controller.status().reloadRequired },
        }));
    }
    async function refresh() {
        // Once withdrawn, a fresh page is required for a clean provider lifecycle.
        if (withdrawn) return;
        const ownRevision = ++revision;
        policy = { ...policy, consent: 'denied' };
        try {
            const response = await w.fetch('/lf-theme/tracking-policy', {
                credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Policy unavailable');
            const next = await response.json();
            if (ownRevision !== revision || withdrawn) return;
            if (!next || next.enabled !== true || next.websiteId !== initial.websiteId ||
                next.environment !== initial.environment || next.gtm !== initial.gtm ||
                next.meta !== initial.meta || next.consentSource !== initial.consentSource) {
                deny(); return;
            }
            policy = next;
            if (next.consent !== 'granted') { deny(); return; }
            const relay = w.LFThemeClickRelayV1;
            if (next.eventContract !== 'lf-click-v1' || !relay || !relay.attach(next, () => policy)) {
                deny(); return;
            }
            publishConsent('granted'); controller.schedule();
        } catch (_) {
            if (ownRevision === revision && !withdrawn) deny();
        }
    }
    w[key] = Object.freeze({ refresh, status: controller.status });
    d.addEventListener('optionalCookiesAccepted', refresh);
    d.addEventListener('optionalCookiesDenied', deny);
    // Endpoint revalidation avoids trusting cached HTML consent or site settings.
    refresh();
})(window, document);
