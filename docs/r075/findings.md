# QA-R075 — Early requests for verified page stylesheets

Round/run QA-R075 / QA-R075-20261027-01. Date27 October2026, Africa/Cairo.
Execution owner Codex; acceptance owner Hany Abdelaal.
Scope: theme-owned performance delivery, existing enrolled Cargo page on Staging website1 only.
Stage: candidate/source verification and controlled browser comparison complete; native candidate/installed acceptance OPEN.
Candidate version19.0.2.7.3. Branch feature/cargo-insurance-core-02; baseline bf2eeb2634d6d4632ea2c91efc942941b466425d, same tree as Staging ec7cc7966da79a03c2c67a5613240c038f11fd98.
Decision: ready for candidate review/native probe, NOT merge or deployment acceptance.

## Concrete change
For an already admitted critical-CSS response, add two rel=preload/as=style links immediately after the actual head start for the existing Cargo and Search CSS. Keep their original stylesheet links/order, all rules, fonts and content. Current asset URLs are resolved through the existing R072 SHA1 attachment gates. Do not preload the large deferred service sheet.
The renderer falls back to exact original output for missing/changed resources, unreviewed hints, existing hints, duplicates, invalid URLs/head positions or other admission failures. Existing off/query/other-page/CSP gates remain.
No tracking code, Clarity setting, font payload, page layout, protected addon or schema/content change. No per-request network fetch or new runtime dependency.

Existing Staging trial flag is already true: deploying/reloading this candidate would begin adding the hints on eligible responses. There is no new activation switch. No deployment occurred in this round.

## Controlled evidence
Run https://github.com/Runzato/performance-lab/actions/runs/40497111916
Lab commit88de23977491f270588d70038a62675bb5797a45.
Artifact12731776539 SHA2567a358bce82c5c35cce678f96cb2ec436708723fbe788a039991cce6eb792d508.

24 measurements: three per arm per mobile/desktop; separate CPU profiles excluded from medians. Fixed public snapshot via loopback HTTPS, sandboxed Chrome145, simulated frozen vendor delays; mobile4xCPU150ms1638.4kbps, desktop1x40ms10240kbps. All arms preserve existing Critical CSS/fonts/Clarity. Three replicates are exploratory, not final five-run PSI acceptance.

| Mode | FCP median ms | LCP median ms | LCP range ms | Long-task proxy median ms |
|---|---:|---:|---|---:|
| Mobile current |916|916|900–960|551|
| Mobile preload candidate |796|832|832–856|526|
| Desktop current |264|280|276–292|0|
| Desktop preload candidate |236|288|276–292|3|

Mobile LCP median9.2% lower, FCP13.1% lower; each paired mobile LCP improved (60,68,128ms). Desktop LCP has no demonstrated gain (median8ms higher within same range); do not claim improvement on both devices.
Long-task proxy is not Lighthouse TBT. Separate-run absolute values must not be compared directly with R073/R074 as product improvements.
All24 cases recorded no page errors/vendor misses/snapshot misses/server errors; service CSS transferred once and full loader completed.
Round1 final viewport screenshots were pixel-identical for current vs preload on mobile412x900 and desktop1440x900. Hero geometry and sampled computed fonts matched. This is not full UI/journey or physical-device acceptance.
CLS remained0.1112 mobile and0.001071 desktop in the lab. Native PSI earlier reported0: the discrepancy remains OPEN.

## Rejected/deferred experiments
Inlining full Cargo/Search CSS: mobile LCP880ms, less benefit than preloading and larger HTML; desktop284ms. Not selected.
Meta autoConfig=false: mobile proxy551->518ms (~6%), inconsistent paired benefit; no complete event acceptance. Logged fixture command preceded init, but event-attempt telemetry did not establish vendor receipt or even complete outbound attempt coverage. Do NOT deploy this change.
Google public configuration includes automatic scroll/video/forms/outbound/download/history and automatic user-provided-data features. This inventory is not proof any feature is unnecessary or individually expensive.
Sampled self-time attributes execution to SDKs and shared initial modules; it does not justify disabling providers or contradict R074's long-task comparison. No Google or Meta configuration changed.

## Source checks
- Six new R075 guard/adapter cases plus11 inherited R072 cases PASS.
- Eight R069 policy, seven R070 component/document and six R070 adapter case executions PASS.
- Existing Node loader regression PASS (normal/duplicate/hidden/timeout/retry/missing-RAF).
- Source renderer output equals the measured preload fixture byte-for-byte on a captured active R072 document; body/critical CSS/loader preserved.
- Syntax checks for changed Python PASS.
- Native Odoo candidate function, installed hook, real resource transfer deduplication, full journeys, physical Safari/iPhone and native PSI75/90 acceptance NOT RUN.

The older minimal schema fixture now explicitly omits the new optional hint field; R075 separately tests hint mapping/checksum failures. This does not weaken runtime gates.

## Native pre-upgrade probe
qa_review/r075/check_native_candidate.py runs in Odoo shell with __file__ set to the candidate path. It asserts exact Staging database identity, fetches the active R072 document, verifies and reverses only its exact critical injection, checks current ten resources, then invokes the candidate function using real attachment metadata with fixture request eligibility. It verifies enabled/off/query and exact two current hints, rolls back, does not register hooks or change settings. This is not installed-hook/browser acceptance.

## Release/recovery/next gates
No merge, Odoo upgrade, activation or Production operation authorized by this delivery.
Review the concrete candidate and run native probe before merge decision. After separately approved Staging integration/reload, verify marker/two hints/no duplicate transfers and affected UI/journeys. Then five measurements per device on the same release/settings: mobile median>=75, desktop>=90, all scores/range and active delivery evidence reported.
This small candidate is not claimed sufficient for those targets.
Recovery: restore known-good R072 source ec7cc7966da79a03c2c67a5613240c038f11fd98 and reload through the normal approved Staging deployment process; preserves Critical CSS and prior flag. No data migration or record rewrite is introduced.

## Source delivery
Draft PR212: https://github.com/EIT-Hub/freightforwarder/pull/212
Candidate a7bf7d2f116f199de893706d2cdb3df9a77cad29. Not merged/deployed.
