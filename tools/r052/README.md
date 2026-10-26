# R052 external Staging performance runner

Executor: Codex. Acceptance owner: Hany Abdelaal. Independent tooling repository
Runzato/performance-lab, outside Runzato SaaS release branches. EIT-Hub run40291913818
was blocked by billing; Runzato hosted job121475562556 completed successfully.
Remaining organization allowance is not verified. Runzato/runzato PR32 was closed
without merging; its branch is retained as the transfer reference.

## Boundaries

This directory contains measurement tools only, copied from EIT-Hub/freightforwarder
PR205/source917e861e98265002d566d45adbeb2d889d5ba9f8. Only file location and
allowed source branches were adapted. No application addon, server SSH, secrets,
database, deployment or historical QA changes. Do not promote this task to
Staging/Production server releases. The test URL remains fixed:
https://livefreight-staging.odoo.com/cargo-insurance-egypt .

## Running

Actions → R052 tracking comparison → Run workflow → main. The current connector cannot dispatch a
new workflow; use GitHub UI. No push, PR or schedule triggers are configured.
Check organization allowance before running. The job has read-only contents
permission, a 30-minute timeout and no overlapping R052 runs. Reports expire
in14 days; preserve accepted results before expiry.

Versions are pinned: Node22.14.0, Lighthouse12.8.2, Chrome145.0.7632.117,
action commit SHAs and npm integrity lock. Ubuntu image version is recorded.
The first gate requires successful Chrome launch with its sandbox enabled.
There is no --no-sandbox fallback, AppArmor/sysctl change or privilege workaround.

Five baseline/blocked pairs run sequentially with alternating order and fresh
Lighthouse browser profiles. Treatment blocks known Google, Meta and Clarity
requests in the test browser only. Baseline may send ordinary anonymous page
views to the existing tracking destinations, like PSI. No form submissions or
conversion journeys. An unresolved AWS events endpoint remains unblocked.

## Interpretation

Read summary.json, runs.json, environment.json and all raw HTML/JSON reports.
HTTP/page/asset checks fail closed; absent baseline GTM, successfully delivered
blocked requests and first-party asset URL drift invalidate the comparison.
Review warnings, per-run tracker counts, metric ranges and any server edits
between runs. Equal asset URLs alone do not establish equal page content.
Do not deploy/change the tested page while running.

These are mobile simulated lab results; they do not certify real devices,
field CWV, event/consent parity, or performance of a future deferred loader.
Known trackers are removed together, so individual vendor costs are not isolated.

## Validation and recovery

Local: node --test tools/r052/compare.test.mjs (5 groups PASS), node --check
and workflow YAML checks. The original transfer passed Runzato repository administration CI;
that SaaS check is not installed in this independent repository. Real Chrome/measurement remains NOT RUN
until the manual job completes successfully.

Cancel the job or disable/revert this workflow to stop the experiment.
No Odoo upgrade or database rollback is required.
