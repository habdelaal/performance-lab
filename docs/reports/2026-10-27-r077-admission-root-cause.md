# R077 — Critical CSS admission root cause

Executor: Codex. Target: Live Freight Staging Cargo Insurance only.
Lab source: 5dc305f754f95c2633d3cc70b9798153774420e8.
Run: https://github.com/Runzato/performance-lab/actions/runs/40581517654
Artifact: 12768789981; ZIP SHA256 83480b85cfc6ef8bdaaa0571f02531bea13c55604bda55605c68d9753c85ce57.

## Evidence

Sandboxed Chrome 145.0.7632.117: three mobile visits, three desktop visits, then three JavaScript-disabled control visits. Same session retained within each group; browser cache disabled. Normal vendor requests allowed, no forms/clicks/login/configuration/restart. All nine responses: HTTP200, document_mismatch, 60556 decoded bytes, no critical style. No pageerror events recorded. This is diagnostic capture, not functional or performance acceptance. The no-JS control ran after JS visits, so it does not exclude an earlier JS-triggered cache transition.

All nine captured responses normalize to SHA256 1d0943a24c7d7f3365e0fbc067b215de1d5689e26d259702c1b091fbbcd3870c under the current deployed comparison rules. The archived accepted baseline normalizes to the profile's expected 5cc3bfe50e416b0ad63737a49b513f3790ee2a6a0638e33543d97562a5bd59e9.

The sole difference after existing normalization is odoo.__session_info__.translation_hash:
- Accepted baseline: empty string.
- Rejected captures: 3c751c39c2291fa3adca25969743845c093f8834.

Locally restoring ONLY this field to the reviewed empty value makes all nine normalized documents byte-identical to the accepted baseline. No server response or runtime setting was modified. This explains the captured document_mismatch gate; it does not prove every historical rejection had the same field difference.

## Native semantics

Read-only upstream Odoo 19.0 inspection: addons/http_routing/models/ir_http.py get_frontend_session_info inserts _get_cached_frontend_translations_hash(lang). Its documented contract returns the /website/translations hash if cached, otherwise an empty string. This cache-dependent metadata was mistakenly treated as immutable page content by the Critical CSS comparison. It explains why a cold first request can pass and later requests on the same worker fail. Exact cache-transition trigger in the historical PSI request was not instrumented.
Source: https://github.com/odoo/odoo/blob/19.0/addons/http_routing/models/ir_http.py

## Proposed narrow correction — not implemented/deployed

Normalize this single validated metadata value for comparison only, preserving actual outgoing session data and translation loading. Require reviewed language and translation endpoint; accept only documented/verified empty or valid hash shape. Preserve checksums, page-content/CSS guards and other session fields. Add regression cases for cold/warm metadata, invalid value and unrelated session/language/content changes, then verify actual browser delivery remains applied before final performance runs. Remove temporary R076 diagnostics only after stability acceptance.

No freightforwarder source change, merge, deployment, configuration change or performance improvement was made in R077. Mobile>=75 / desktop>=90 median-five acceptance remains open.
