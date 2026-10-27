# R078 installed cold/warm delivery verification

Executor Codex; acceptance owner Hany Abdelaal. Staging only.
App PR214 merged as 2057b4a4fb8402a7ccfcb1a2e4f720f7b918c466.
Operator reported green build and R078 source receipt.

Operator HTTP evidence: initial resource_missing with empty translation_hash;
checksum-verified warmup followed by3/3 applied with empty hash. The asset generation
startup condition is separate from the translation-cache defect.

Independent Chrome145 sandboxed run:
https://github.com/Runzato/performance-lab/actions/runs/40581517654/attempts/2
Same lab harness/source5dc305f754f95c2633d3cc70b9798153774420e8 as the failed before-run.
Artifact12772445134 ZIP SHA256 f14c071288a93911f3168aa4009d9415565fb76e41a4b2bf5173d23ecd7138fd.

- Mobile visit1: empty translation_hash, applied.
- Mobile visits2/3: hash3c751c39c2291fa3adca25969743845c093f8834, applied.
- Desktop visits1/2/3: populated same hash, applied.
- JavaScript-disabled controls1/2/3: populated same hash, applied.
- All9 HTTP200, X-LF-Critical-CSS:r069, diagnostic applied, one critical style after
  load, no pageerror events. No form submissions, configuration writes or restarts.
- Additional independent public HTTP request after browser warmup: populated same
  hash, applied, event2c1686bb87af4192.

PASS: installed admission across an observed cold-to-warm metadata transition and
subsequent reloads. Before correction the identical browser harness captured9/9
rejections due solely to translation_hash drift; after correction9/9 were admitted.
This closes the specifically reproduced translation-cache admission defect in the
observed scope. It does not certify all workers/future page changes or eliminate
post-build resource_missing before native assets are generated.

Not performance acceptance: no Lighthouse scores, functional journeys, physical
Safari, or geometry/screenshots were tested in this capture. No pageerror is not
full functional acceptance. Temporary R076 diagnostic instrumentation remains;
remove it through a reviewed Staging change before final median-five measurements.
Targets remain mobile>=75 and desktop>=90 with variability and function checks.
