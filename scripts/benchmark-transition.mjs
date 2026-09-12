import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Run against the built checkout served by scripts/serve-tests.mjs.
const chromePath = process.env.VISDELTA_CHROME_PATH;
const browser = await chromium.launch(chromePath ? { executablePath: chromePath } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:5511/tests/fixtures/runtime.html');
  await page.waitForSelector('rect.vd-bar');
  const results = await page.evaluate(async () => {
    const sl = await import('/dist/visdelta.esm.js');
    const results = [];
    document.body.innerHTML = '<div id="benchmark" style="width:1200px"></div>';
    for (const count of [100, 500, 1000]) {
      const rows = Array.from({ length: count }, (_, i) => ({
        id: `item-${i}`, a: 10 + i % 91, b: 10 + (i * 7) % 91
      }));
      const from = sl.bar().data(rows).x('id').y('a').key('id');
      const init = performance.now();
      const pair = await sl.transition(from, from.y('b'), { target: '#benchmark', d3, aq, height: 500 });
      const initializeMs = performance.now() - init;
      for (const p of [0.13, 0.8, 0.37]) pair.progress(p);
      const samples = [];
      for (let i = 0; i < 31; i++) {
        const start = performance.now();
        pair.progress(((i * 37) % 99 + 0.5) / 100);
        // Includes synchronous layout, but not browser raster/compositing time.
        pair.view.getBoundingClientRect();
        samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      results.push({ count, initializeMs, medianSeekMs: samples[15], p95SeekMs: samples[29] });
      pair.destroy();
    }
    return results;
  });
  const report = { recordedAt: new Date().toISOString(), browser: browser.version(), samplesPerSize: 31, results };
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
