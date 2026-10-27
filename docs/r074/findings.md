# R074 — Provider cost and same-font delivery experiments

Date: 2026-10-27. Executor: Codex. Acceptance owner: Hany Abdelaal.
Scope: authorized follow-up to R073 on Staging; diagnosis and lab candidates only. No product source changes, GTM publication, Odoo configuration changes, source merge, or Production work.

## Decision
Retain current Critical CSS. Do not ship either tested font-delivery variant as a speed improvement: both increased LCP in this controlled mobile experiment. Tracking optimization should focus on Meta and Google execution, preserving required events, consent and attribution. This experiment does NOT authorize turning either off on the site. No duplicate loader was established by public container inventory.

There is no validated shippable speed improvement from this round. The next narrowly scoped investigation is vendor feature/event execution cost and remaining page-specific render-blocking CSS. Do not replace the frontend or silently change fonts. Final targets remain mobile median >=75 and desktop median >=90, five measurements each plus dispersion and functional validation.

## Run and design
https://github.com/Runzato/performance-lab/actions/runs/40493670064
Lab commit ef9bc52157c0ec2f9ffad54501d642958cd901ed.
Source Staging baseline ec7cc7966da79a03c2c67a5613240c038f11fd98.
Artifact12729542155, SHA25618e48962162e0e66ea9d8f82e87402a83c2f93f90e1993c4da885f375b79a2ed.

18 cases: three mobile repetitions per arm, alternating arm order. Same R072 snapshot guard; all arms retain Critical CSS. Six fresh native eligible receipts showed marker/style/loader; two query-bearing receipts fell back as expected.
All18 recorded no page errors, vendor cache misses, first-party snapshot misses or server errors. Full stylesheet delivered once and reached full-ready state. Final sampled hero geometry and computed font families/sizes matched.
Chrome sandbox enabled; fixed first-party HTTPS snapshot, simulated vendor replay, 150ms/1638.4kbps and4xCPU;16second observation. Browser contexts cold, same browser process. This is not native PSI, final functional acceptance or a desktop test.

## Medians
| Arm | LCP ms | Blocking proxy after FCP ms | CLS |
|---|---:|---:|---:|
| Current full |1028|991|0.1112|
| Meta suppressed |1036|630|0.1112|
| Clarity suppressed |1024|961|0.1112|
| Google suppressed, including dependent GTM tags |1024|638|0.1112|
| Inline unchanged font CSS imports |1124|905|0.1112|
| Inline plus exact Inter/Oxygen font preload |1240|929|0|

The proxy sums max(long-task-duration-50,0) for tasks starting after FCP. It is NOT Lighthouse TBT. Changed FCP changes its window.
Current full proxy ranged910–1529ms; the first full run was high with no recorded network error, so retain it rather than silently excluding it. Meta arm622–638, Google616–653, Clarity945–967ms. Three repetitions are exploratory, not stable five-run acceptance.
Meta suppression gives36.4% lower proxy median, Google35.6%, Clarity3.0%. Effects are not additive and Google includes dependent container tags. LCP is essentially unchanged by provider suppression.
Do not compare these absolute medians to R073 as if they were a paired product improvement: separate cloud run/snapshot/vendor timing.

## Font experiment
Current critical sheet begins with two imported font definition stylesheets: /web/content/33593/google-font-Inter and /web/content/33600/google-font-Oxygen.
Inline variant copies their complete byte-verified definitions at original import positions, retaining families/weights/styles and root-relative resource URLs. SHA1 gates1495474606fd2ccb01e8fb43058c3e745bd78bd3 and3b2eeab8e666f8eda9bf3a80c6488e2807f702d4. No network fetch would be needed during a product request for a prebuilt payload.
This adds16957decodedbytes and about1059gzipbytes to sampled HTML. LCP worsened1028->1124ms (+9.3%).
Adding exact existing Inter/Oxygen preloads reduced lab CLS0.1112->0 and font-ready time, but worsened LCP to1240ms (+20.6%). This is a stability/speed tradeoff, not an accepted speed fix. Lab CLS differs from native PSI CLS0; physical/native validation remains open. No font change or preload was deployed.

## Container inventory
Public deployed GTM resource version19 contains one Google base tag,11 GA event tag definitions, one Clarity tag, consent adapters and a click relay. Distinct events are not proof of duplicate firing. Published code inspection is not GTM workspace or platform conversion acceptance. No container was edited.

## Open verification and next scope
- Attribute Meta/Google runtime cost to features and required events before proposing removal or simplification; preserve PageView/conversion/event contracts.
- Isolate the remaining page CSS/render dependency path rather than assuming font imports explain native mobile LCP.
- Keep historical PSI fallback cause unresolved; this round reproduced no eligible exclusion.
- No live chat/form/CAPTCHA/conversion journey acceptance, physical Safari/iPhone acceptance, desktop comparison or five-run PSI target acceptance.
