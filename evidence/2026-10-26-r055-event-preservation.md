# R055 event preservation review

Executor: Codex; browser execution GitHub Actions 40355178357, commit5140ee4cfe059a00b735e5c2deb4aea984ce76ad. Scope: isolated synthetic page at Staging URL, actual published GTM fetched once and pinned across cases. Analytics collection intercepted and fulfilled locally; Meta/Clarity runtimes stubbed. No Odoo/GTM modification or actual customer journey.

## Finding

All 12 diagnostic cases completed. Four click patterns (quote_request, freight_search, view_route, request_booking) each produced one matching native GTM auto-event when clicked after GTM readiness, both immediate and deferred loaders. All four early clicks before the deferred GTM response completed produced zero native auto-events. Deliberate 800ms GTM response delay demonstrates a feasible network timing window, not its population frequency. Even the immediate legacy loader can miss clicks before it is ready; this test establishes that the candidate does not preserve early events and extends the exposure window.

GA event collection attempts for all four early cases were absent. After deferred readiness each expected event request was observed locally. The baseline-ready view_route case had one native click but no matching GA request within the bounded observation window: vendor receipt/conversion acceptance is NOT claimed for any case. No JavaScript errors observed. Requests were intercepted, not received by analytics vendors.

## Decision

R054 performance benefit remains valid within its measured scope. R055 blocks declaring event preservation or activating the existing full-GTM deferral as a completed delivery. Keep current Odoo mode OFF. Clarity staging exclusion is unrelated and remains deferred.

## Required correction contract

Capture only actual eligible user interactions, with a minimal event schema and consent evaluated at capture and delivery. Define stable event IDs and exactly-once ownership across native GTM listeners and queued events. Account for same-origin navigation before GTM readiness, reload, rapid repeated clicks, withdrawal and expiry. Do not replay DOM clicks, delay navigation, fabricate success/conversion events, or publish an unreviewed GTM change. Existing GTM click triggers alone cannot consume a new custom queue contract; prepare the matching versioned consumer before activation. Successful form submission remains authoritative for conversion events, not a CTA click.

Next source work belongs to the theme on EIT-Hub/freightforwarder feature/cargo-insurance-core-02, with lab tests on qa/r053-browser. No production or protected-module changes. Actual staging activation and full journeys remain OPEN.
