# Bar transition cache benchmark

Measured locally on 2026-09-05 with Chrome 152.0.7977.77, using the same Mac and
the same `scripts/benchmark-transition.mjs` procedure before and after the cache
implementation. The baseline was recorded at 09:02:41 UTC and the final cached
version at 09:18:01 UTC. These are working-tree measurements, not a comparison of
published releases.

Each case changes the y variable of a simple bar chart at a fixed 1200-pixel
container width and 500-pixel chart height. After three warmup seeks, 31
deterministic nonsequential interior progress values are sampled. Timings include
the synchronous `progress()` call and a bounding-box read to flush layout, but
exclude rasterization/compositing. They are not end-to-end frame rates. The table
does not measure phase/endpoint switches, where cached DOM nodes are restored.

| Marks | Before: median seek | Cached: median seek | Before: p95 seek | Cached: p95 seek |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 4.3 ms | 0.2 ms | 5.6 ms | 0.3 ms |
| 500 | 15.7 ms | 0.6 ms | 21.7 ms | 0.7 ms |
| 1000 | 30.1 ms | 1.2 ms | 37.3 ms | 1.6 ms |

Initialization now performs more work upfront:

| Marks | Before: initialization | Cached: initialization |
| ---: | ---: | ---: |
| 100 | 5.2 ms | 13.9 ms |
| 500 | 11.0 ms | 41.8 ms |
| 1000 | 20.1 ms | 72.6 ms |

Initialization is one observation per size, not a percentile. Seek timings are
rounded to one decimal place. Hardware, browser load, chart configuration and
data affect results. Retained phase/endpoint nodes also increase memory use;
memory and worst-case multi-step costs have not been benchmarked here.

## Reproduce

```sh
npm test
npx playwright install chromium
node scripts/serve-tests.mjs
```

In another terminal, run:

```sh
node scripts/benchmark-transition.mjs /tmp/visdelta-benchmark.json
```

For installed Chrome, set `VISDELTA_CHROME_PATH` to its executable. Browser
regressions in `tests/browser/compiled-transition.spec.mjs` independently assert
that seek/play do not recreate data tables, scales or D3 schedules; that common
SVG nodes survive; and that mark geometry matches the reconstruction renderer.
Run them with `npm run test:browser`.

Built-in bar pairs use the cache; other chart types and
custom renderers retain the existing reconstruction path unless explicitly
opting into the cached-property contract. `resize()` invalidates
the cache and recompiles using the already-loaded data at the same progress.
