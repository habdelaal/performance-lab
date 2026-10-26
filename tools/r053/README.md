# R053 isolated browser tracking fixture

Runs on qa/r053-browser in the independent performance-lab repository. No SaaS branch or Odoo deployment is changed.

Pinned copies of theme JavaScript from the commit in provenance.json are verified before testing. Uses the existing R052 lockfile (puppeteer-core 24.43.1, chrome-launcher 1.2.2), Chrome 145.0.7632.117 and Node 22.14.0. Chrome sandbox bypass flags are prohibited.

A loopback HTTP fixture supplies policy JSON. Puppeteer intercepts every page request: only loopback requests continue; vendor script requests receive deterministic local stubs; all other origins are blocked and fail the test. Test IDs are synthetic. No live analytics or conversion is sent.

Fourteen cases cover consent, timing, one-time initialization, identity failure, existing loaders, exclusions, stale policy responses and provider failures. Reports preserve request attempts and stub calls. PASS means browser mechanics under fixtures, not live GTM tag/consent behavior, Odoo worker delivery, physical Safari, conversion parity or performance.

The workflow runs automatically when this test branch receives relevant changes and preserves reports for 14 days. Native Odoo HTTP evidence remains in EIT-Hub/freightforwarder.
