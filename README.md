# performance-lab

Isolated performance testing tools and GitHub Actions workflows for Lighthouse
benchmarks, tracking impact analysis, and QA reports, independent of Runzato’s
SaaS release cycle.

## R052 — Live Freight tracking comparison

[Runner instructions and evidence limits](tools/r052/README.md).

Run Actions → R052 tracking comparison → Run workflow → main.
The workflow is manual-only, capped at 30 minutes, and keeps artifacts for14 days.
The fixed target is Live Freight Staging Cargo Insurance, not a Runzato website.
No server SSH, application deployments, database credentials or GTM writes.

Local validation: `node --test tools/r052/compare.test.mjs`.
Actual Chrome sandbox readiness and performance results remain NOT RUN until
successful execution on the cloud runner. No Odoo upgrade is needed.
