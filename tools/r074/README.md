# R074 provider and font diagnosis

Authorized follow-up to R073. Executor: Codex. Source baseline staging ec7cc7966da79a03c2c67a5613240c038f11fd98. All changes are lab-only on qa/r053-browser; no product merge/deployment.

Retain Critical CSS in every arm. Three mobile repetitions per arm: full, Meta suppressed, Clarity suppressed, Google suppressed (includes dependent GTM tags), inline byte-verified Inter/Oxygen CSS at the original import positions, and same inlining plus exact current Inter/Oxygen font preloads. No font family/weight/style/content changes. Preserve full stylesheet loader.

Use R073 snapshot/hash guards and sandboxed Chrome. Collections intercepted and first-party writes refused. Vendor code is frozen replay with simulated delays; blocking proxy is not Lighthouse TBT. Record misses/errors; exclude affected rows from inference. Native receipt checks only precede fixture comparisons. The product still requires five mobile and five desktop acceptance runs, medians75/90, dispersion and full journeys.

Inlining adds font CSS to the HTML; this is an experiment, not a proposed unbounded per-request fetch or a reviewed production implementation. Compare final computed fonts/hero bounds and CLS; screenshots do not establish chat/form/tracking-event acceptance.
