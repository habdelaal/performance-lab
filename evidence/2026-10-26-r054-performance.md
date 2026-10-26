# R054 current versus deferred tracking — 26 October 2026

Executor: Codex via GitHub Actions. Owner: Hany Abdelaal.
Decision: measurement completed; positive median effect with variation. Not deployment acceptance.
Run: https://github.com/Runzato/performance-lab/actions/runs/40349267214
Test commit: bcf00d7d926186f9869ac4c4e34909b92a6e2b2c.
Exact target: https://livefreight-staging.odoo.com/cargo-insurance-egypt

Five alternating baseline/deferred mobile pairs (10 Lighthouse navigations), each
with a fresh Chrome process. Chrome145.0.7632.117 with sandbox bypass prohibited;
Node22.14.0, Lighthouse12.8.2. Shared first-party asset and rendered content
signatures each had one value across all10 runs. No page JavaScript errors or
Lighthouse warnings. Google/Meta executable loaders and GTM start each occurred
once per run; Clarity remained loaded in both modes. No exclusion was activated.

| Metric | Baseline median | Deferred median | Interpretation |
|---|---:|---:|---|
| Performance score |47|53|+6 points; not a field score|
| FCP |3466.70ms|3467.67ms|Essentially unchanged|
| LCP |4683.95ms|3916.85ms|16.4% lower median|
| TBT |2019.00ms|1682.00ms|16.7% lower median|
| CLS |0|0|Stable in these runs|
| Transfer |2156360 bytes|2166112 bytes|+9752 bytes; no payload saving|

Median paired reduction: TBT372.5ms; LCP813.18ms. TBT improved in3/5 pairs,
regressed in2/5; ranges overlap (baseline1835–2054.5ms, deferred1521–2119.5ms).
Score improved in all5 pairs. Do not convert this into a universal per-visit gain.
Absolute results differ substantially from the earlier runner attempt and PSI;
only within-run paired comparisons support this conclusion. No claim of field
CWV improvement or a universal score threshold is made.

## Intervention and boundaries

Response-stage interception runs in both arms. Baseline HTML stays unchanged;
deferred removes the two known inline bootstraps and inserts pinned R053 source
plus synthetic granted policy, delivered through a browser-only endpoint override.
No Odoo/GTM source, settings, deployment, publication or durable activation changed.
The reviewed-container flag remains a fixture. Live vendor scripts were retained;
synthetic page visits can reach analytics, but no form or conversion action was
submitted. This measures delayed startup, not completed consent integration.

DOM structural parity is limited smoke evidence, not full visual/functionality
acceptance. Full-page screenshots were collected after Lighthouse but are not
used as proof of visual parity; full chat/form/CAPTCHA journeys remain untested.
Inline experimental source delivery also differs from deployed asset delivery.

## Preserved first attempt

Run40348465880 reached9 accepted rows then stopped on a false duplicate check.
The tenth navigation contained one executable GTM response (200,398264 decoded
bytes) and one empty204 response on gtm.js with is_td=1. The initial counter
counted both as loaders. The corrected check counts successful nonempty JavaScript
responses, separately records204 telemetry and keeps DOM/bootstrap checks.
The full five-pair suite was repeated; the first attempt remains failed as recorded.
Its ZIP SHA256:24679956fc49bab6e257a77ddc28a0ada7da12f912b8e8d936a0a0d5f4ca45df.

## Evidence and next action

[Compact evidence](r054-comparison-40349267214.json) preserves environment, metrics,
all10 rows, warnings/errors, runtime loader state and signatures. Raw LHR/screenshot
artifact12662503500 has verified ZIP digest
 a577d57825143e5f92f807bf984a3eb318715b7d3f11c6503feaeb3deb56bafa.

The authorized experimental performance task is complete. Clarity exclusion remains
deferred by owner direction. Consent integration and actual vendor/conversion
acceptance remain explicitly outside this experiment; do not mark them PASS.
Durable Staging activation is a separate next delivery requiring its concrete
configuration/recovery plan and scoped journey validation. No Odoo upgrade is
needed for these lab-only files. Avoid extending the delay solely to hide vendor
work outside measurement. Preserve the1.5s/on-interaction candidate pending the
separate activation decision.
