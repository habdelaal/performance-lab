# R068: critical CSS socket comparison

Status: experiment passed; not deployed and not native performance acceptance.

## Evidence

- Final run: https://github.com/Runzato/performance-lab/actions/runs/40449914650
- Measured commit: 287bb6cb9116f87338698b548ab9aa37cf58d6db
- Earlier no-cache diagnostic: https://github.com/Runzato/performance-lab/actions/runs/40449473422
- Transport calibration: https://github.com/Runzato/performance-lab/actions/runs/40448880682
- Source Staging was not modified.

Three cold browser contexts per mode, alternating order, 412 x 900, CPU 4x, network latency 150 ms, download 1638.4 Kbps. Public Staging HTML/assets pinned and served over actual loopback HTTPS sockets with gzip. Normal asset caching within each fresh context; no browser-cache reuse between contexts. Chrome sandbox enabled.

| Median | Baseline | Critical then full |
|---|---:|---:|
| FCP | 2096 ms | 1096 ms |
| LCP | 2096 ms | 1096 ms |
| CLS (maximum session window) | 0.111197 | 0.111197 |
| Full CSS socket transfers per navigation | 1 | 1 |

FCP/LCP improvement: 1000 ms, 47.71%, in this fixture. This is not a prediction of PSI score or native Odoo timing. Full CSS is still downloaded; critical inlining adds HTML bytes.

Seven sampled visual comparisons (mobile initial/menu/appearance/enquiry; desktop initial/appearance/enquiry) retained exact screenshots, layouts and platform fonts. No JavaScript errors; tracking bridge started and one GTM bootstrap per document. Vendor collection intercepted; Meta/Clarity runtime stubbed equally. No conversion receipt or complete chat/form journey acceptance.

Native CSS: 1,010,385 decoded bytes, SHA-256 5ea9d036011ac8a4bf7839f9442803614bbd3be6e9ee21535b81d1a06efbd5c7.
Critical CSS: 160,405 decoded bytes, SHA-256 6b3cea15044f8f1d68818cf2a9dfb27fc5f5e5e568da4a1f726fb95c8e6886f8, 1228 rules.

## Diagnostic interpretation

The first experiment disabled caching and served no-store assets. Candidate transferred full CSS twice and accumulated extra movement. These observations must not be treated as native regressions without checking cache behavior. Native CSS response advertises public, max-age=31536000, immutable. After enabling ordinary within-document caching with a new context per trial, both modes transferred full CSS once and had identical layout shifts.

The remaining shared shift affects the hero image, hero note and following sections. Its underlying cause has not been proven; it is not introduced by critical CSS in this experiment. Do not claim native CLS equals this fixture result.

Transport calibration proved intercepted response fulfillment bypassed network throttling (200KB around23ms versus4.17s real socket). Timing therefore uses real sockets, not fulfilled main HTML/CSS. The final socket calibration transferred200KB in8.94s with outstanding page traffic under50KB/s throttling, confirming a throttled transport, not a standalone throughput benchmark.

## Remaining gate before native integration

No generic enablement for future pages. Native implementation needs exact reviewed route/website/public shell/style and markup eligibility, full CSS fallback on mismatch/editor/debug/unknown content, no-JavaScript and loader failure handling, and tests for cache-disabled delivery. Capture is English and two viewports; Safari, RTL, tablet and changed pages are not accepted by this evidence.

After guarded source implementation: native Odoo compilation and HTTP delivery, actual browser journeys, native mobile repeated PSI, then merge/deployment acceptance. Do not merge merely because this lab run is green.
