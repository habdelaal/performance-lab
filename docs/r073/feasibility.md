# R073 feasibility decision — 2026-10-27

## Scope and decision
Retain Critical CSS. Updated acceptance targets are mobile Performance median >=75 and desktop >=90, each from five runs, with dispersion and functional checks. This round authorized diagnosis and controlled comparisons only. No product source changes, production deployment, or merge.

Evidence supports reducing tracking JavaScript cost first for blocking, alongside a narrowly scoped investigation of the remaining mobile render path (page CSS/font dependencies). Shared initial JavaScript is the next candidate if needed. A replacement frontend is not justified by current evidence. These are priorities, not a promise that two changes achieve the targets.

## Stability
20 public HTTP receipts and six fresh browser document receipts all contained the critical marker, one critical style and one loader. Two query-bearing browser requests intentionally fell back. No eligible exclusion reproduced in this sample.
Earlier PSI reports differed in whether service CSS was render blocking. The exact historical exclusion cause remains unresolved; current success does not retrospectively explain it.

## Controlled experiment
Run: https://github.com/Runzato/performance-lab/actions/runs/40489559469
Runner commit: a09f6d5af374facf181d54da6b0e96ed13a67bf5
Artifact: 12727771787; SHA256 fd9543ea27fbac7ef5258c48b2420cea6b4d473718b1a7e1341fc69a28534e05.
24 runs: three repetitions of CSS off/on crossed with full, tracking suppressed, shared initial bundle suppressed, and both suppressed.
Sandboxed Chrome; fixed first-party snapshot via HTTPS socket, gzip, cold browser contexts, 150ms/1638.4kbps and 4x CPU slowdown. Vendor scripts frozen/replayed with simulated network delays; collection requests suppressed. This is a causal lab, not native PSI or end-to-end functionality.

Exclude round 2 baseline_full from clean comparisons: one additional GTM script received 204. Remaining 23 runs had no recorded vendor/snapshot/server misses. All critical-on runs were clean.

Critical-on medians (three each):
| Arm | LCP ms | Long-task blocking after FCP ms |
|---|---:|---:|
| Full |1120|1463|
| Tracking suppressed |1112|500|
| Shared initial bundle suppressed |1124|1134|
| Both suppressed |1112|120|

The blocking measure is sum(max(duration-50,0)) for recorded long tasks starting after FCP, NOT Lighthouse TBT. Earlier FCP changes its observation window. Suppression arms are diagnostic only and not functional alternatives.
Tracking suppression reduces this proxy 65.8%; initial suppression 22.5%. Initial bundle is 2,965,425 decoded bytes with 542 module definitions spanning web, website, templates and more: it is not exclusively chat.

Clean no-tracking paired CSS comparison: median LCP 2088 -> 1112ms (46.7% lower). Full clean pairs (rounds1,3 only): 2084 ->1216ms, n=2.
Critical full LCP range1108–1312ms; no-tracking1104–1124ms. Hero downloaded around0.73–0.78s, before paint; deferred full CSS completed around2.35–2.41s. Critical CSS moves paint ahead of full stylesheet completion.
All24 lab CLS values were0.1112, while supplied PSI CLS was0. This discrepancy remains a validation item; equal final hero bounds do not establish visual or functional parity.

## Native PSI and LCP
Two unique user reports, not three:
- https://pagespeed.web.dev/analysis/https-livefreight-staging-odoo-com-cargo-insurance-egypt/d5ek5q7fl3?form_factor=mobile
- https://pagespeed.web.dev/analysis/https-livefreight-staging-odoo-com-cargo-insurance-egypt/alp5c2dhjq?form_factor=mobile

Mobile scores44/41; FCP5.66/6.62s; LCP11.34/11.47s; TBT659.5/735.5ms. Desktop scores70/74, LCP0.7/0.6s, TBT1790/690ms.
If only TBT score becomes perfect and all other category metrics remain fixed, mobile score ceilings are60.1/58.9. Thus a blocking-only intervention cannot establish mobile75.
Hero image is LCP. Raw observed render-delay components are roughly2.07–2.12s versus image loading37–72ms. These raw components must not be summed into the simulated11s LCP. The evidence points to rendering/dependency scheduling rather than image transfer as the immediate investigation priority, but does not isolate every remaining stylesheet/font/CPU contribution.
Tracking suppression barely changes lab LCP, so its large blocking benefit cannot be assumed to solve native mobile LCP.

## Next smallest scope and acceptance
1. Identify/reduce unnecessary or duplicate vendor execution while preserving required events and consent behavior; do not use arbitrary postponement solely to evade measurement.
2. Isolate remaining above-fold page CSS and font/render dependencies, retaining Critical CSS and fallback gates.
3. Consider shared initial JavaScript only after measuring residual impact. Do not label its entire effect chat.

After any separately authorized implementation: five mobile and five desktop measurements of the same release, URL and settings, record all scores/median/min/max and critical-delivery evidence. Targets >=75/90 respectively. Verify mobile/desktop layout, chat, enquiry form/CAPTCHA and required tracking events. Diagnose inconsistent fallback or dispersion before acceptance.
No five-run final acceptance or live journey acceptance was performed in this round.
