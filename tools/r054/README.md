# R054 browser-only tracking deferral comparison

Owner direction26October2026: defer Clarity exclusion and consent integration
acceptance as separate gates; measure the current task without durable activation.
No Odoo/GTM setting, deployment or publication is performed by this workflow.

Five alternating baseline/deferred pairs on the exact Staging Cargo URL. Each
navigation uses a fresh sandbox-enabled Chrome process and the same response-stage
document interception. Baseline is fulfilled unchanged. Deferred replaces exactly
one existing GTM bootstrap and one Meta bootstrap with pinned R053 controller and
bridge sources, plus a synthetic granted policy. The first-party policy endpoint
is fulfilled inside that browser session only; the actual endpoint is unchanged.
The container-reviewed flag is an experimental fixture, not live review approval.

Live vendor scripts are retained in both modes, including Clarity. This produces
synthetic analytics visits but submits no form, lead or conversion action. The
measurement fails if the normal GTM/Meta scripts do not load exactly once or if
Clarity is absent. The shared first-party asset set and rendered content/controls
must remain stable. Error and warning lists are preserved for comparison.

Lighthouse12.8.2 mobile simulated throttling, Chrome145.0.7632.117, Node22.14.0.
Five seconds of post-load observation are requested for both modes so delayed
tracker execution is captured, rather than simply omitted from the report.
Document interception and inline source overhead are measurement limitations;
this does not benchmark durable Odoo bundle delivery or real consent integration.

Report medians/ranges and paired differences for score/FCP/LCP/TBT/CLS/transfer.
Review regressions and variation rather than declaring a win from one score.
Read-only DOM comparison and screenshots do not close full chat/form journeys.
No physical-device, field-CWV or live conversion acceptance is claimed.
