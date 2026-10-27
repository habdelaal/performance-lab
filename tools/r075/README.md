# R075 CSS delivery and vendor feature diagnosis

Executor Codex; Hany product acceptance. Authorized follow-up: retained Critical CSS, fonts and Clarity; no product deploy/merge/GTM edits. Staging source ec7cc7966da79a03c2c67a5613240c038f11fd98.

24 measured cases: 3 repeats x mobile/desktop x current/full-page CSS inline/exact CSS preload/Meta autoConfig false. Same entire page CSS rules preserve cascade; this first checks network delivery before selecting a partial subset. Inline arm rebases relative resource URLs. Meta fixture queues the documented set-autoConfig-false before SDK drains its existing init queue; it does not replace fbq or suppress vendor scripts. This option changes automatic metadata/events, so never infer all tracking preserved from PageView or deploy it without event review.

All arms keep existing Critical CSS, font CSS/imports and Clarity. CSS and initial resources pinned by R072 exact profile. Mobile4xCPU150ms1638.4kbps; desktop1x40ms10240kbps; fixed vendor replay with matching simulated delays. 16s after DOMContentLoaded, long-task proxy NOT Lighthouse TBT. Separate sampled CPU profile navigations excluded from medians. Collection attempts intercepted, no analytics sent. Three repeats do not satisfy five-run PSI75/90 acceptance.

Meta primary implementation reference: https://github.com/facebook/GoogleTagManager-WebTemplate-For-FacebookPixel/blob/main/template.tpl (disableAutoConfig, before init). No Google feature disabled without a verified supported configuration and event contract.
