# 0.2.0 release acceptance

Scope: prepare the next distributable ScrollyLite version around immutable
visualization declarations and same-idiom animated deltas, with Story/scrolling
as optional composition. This is not a commitment to ship every future idiom,
cross-chart morphing, or the whole long-term roadmap in 0.2.

Status: **candidate engineering acceptance passed**. The final clean Node
22.23.2 run passed 26 unit tests, 64 Chrome browser cases, build/size/docs/package
checks and installed-consumer checks (both dependency-free and ordinary npm
peer resolution). Node 18.20.8 separately passed installed imports and strict
TypeScript consumer validation. Publication, Git tagging and pushing have not
been performed. The npm registry read on 2026-09-05 showed
0.1.0 and 0.1.1 only, with latest = 0.1.1; 0.2.0 was available at that check.
Registry state and publishing credentials must be rechecked at publication time.

## Requirements and evidence

| Requirement | Evidence in this checkout |
| --- | --- |
| Chain `.data/.x/.y`, derive a new declaration without changing its source | `tests/transition.test.mjs`, `tests/authoring-contracts.test.mjs` |
| Semantic delta is independent of operation history and DOM | `tests/core.test.mjs`, `tests/inference.test.mjs` |
| Click/time playback and arbitrary 0–1 progress without scrolling | `tests/browser/transition.spec.mjs`, `homepage.spec.mjs`, standalone CDN template test |
| Deterministic reversible frames, stable keyed objects, resize and cleanup | `tests/browser/compiled-transition.spec.mjs`, `transition.spec.mjs` |
| Lightweight focused entry points; no Story or unrelated idioms on the pair path | `scripts/check-bundle-size.mjs`, `tests/browser/modules.spec.mjs`, tarball-backed CDN request checks |
| Shared public plugin contract and stable instance registration | `tests/browser/modules.spec.mjs`, `tests/types/consumer.ts` |
| Strict supported transform grammar rather than silent fallback | `tests/transforms.test.mjs`, `docs/data-transforms.md` |
| Isolated instance colors/themes and recoverable failed mounts | `tests/browser/instance-theme.spec.mjs`, `lifecycle.spec.mjs` |
| Existing four-idiom Story navigation and two layouts still work | Eight weather browser cases; Seq/action/embedding regressions |
| Real installable package and consistent public types/exports | `scripts/check-pack-consumer.mjs`: dependency-free imports, ordinary npm peer resolution, strict consumer TypeScript, browser/global exports |
| Documentation reflects the candidate | 26 pinned CDN references checked against dist; five documentation HTML templates executed with tarball files; explicit migration notes |
| No reliance on old local builds or dependency directories | `scripts/check-clean-install.mjs`: fresh temporary source copy, npm ci, rebuild and full gate on an independent HTTP port |

The combined gate is `npm run release:check`. `npm run clean:check` runs it from
a fresh temporary copy; CI runs the full gate on Node 22, then checks tarball
consumption separately on Node 18. No remote CI run is implied by local results.

## Environment and size boundary

The dependency lock used here resolves D3 7.9.0, Arquero 8.0.3, TypeScript 5.9.3,
esbuild 0.28.0 and Playwright 1.63.0. Full release tooling was tested with local
Chrome on Node 22.23.2 and Node 26.0.0. Node 18.20.8 passed unit tests and the
installed-consumer gate; Playwright itself requires Node 20+, so the full
contributor browser workflow is not claimed to run on Node 18.

Focused gzip measurements are approximately 3.2 KB (delta), 6.9 KB (bar
authoring), and 34.7 KB (bar + transition, including required shared/lazy chunks).
The budgets remain 4,000 / 8,000 / 35,000 bytes. Small gzip differences across
Node/zlib versions are expected. D3, optional Arquero and CSS are excluded; these
are not whole-application download sizes. Root/global entries are full bundles.

## Deliberate limits, not hidden release claims

- Standalone endpoints must have the same idiom. Bar → line is not included.
- Only bar caches frame tracks; line/point/unit reconstruct on seek. Bar's
  compiler still extracts D3 schedules. This remains a documented maintenance risk.
- Only bar renders selective highlight opacity; line where() defaults to range
  cropping. The transform language is a supported subset, not arbitrary JS/SQL.
- External CSS remains document-wide. Multiple owners must not concurrently
  mount into the same host. Destroy before reusing a host.
- Browser checks cover behavior and geometry, not a complete accessibility or
  all-browser visual certification. This candidate's browser evidence is Chrome.

See [migration notes](./migrating-to-0.2.md) and
[module boundaries](./modular-architecture.md) for exact contracts and follow-up
performance work. Remaining publication actions are owner-authorized operations:
finalize the release date, review/commit intended changes, tag, publish and push.
