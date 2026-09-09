# Contributing

VisDelta keeps the public surface small. Before adding API, prefer making an
existing idiom, compiler helper, or plugin capability clearer.

## Local Checks

Use Node 20+ for development/release tooling (CI uses Node 22). Playwright is a
development dependency, not part of the published runtime. Node 18 consumers
are checked separately by installing the built tarball and testing imports/types.

```sh
npm ci
npx playwright install chromium
npm test
npm run release:check
```

`npm test` runs syntax checks, builds `dist/`, and compiles the built-in chart
idioms through the registry.
`npm test` also checks size budgets, documentation paths/versions and unit tests.
`npm run release:check` additionally runs real-browser behavior tests, executes
the documentation's CDN HTML against the candidate tarball, and verifies installed
consumer imports/types. Local Chrome can be selected with `VISDELTA_CHROME_PATH`.

`npm run clean:check` copies current non-ignored Git workspace files into a
temporary directory, omits dist/dependencies, runs `npm ci` and the full release
gate on its own HTTP port, then removes only that temporary copy. It requires a
Git checkout and installed Chrome/Playwright Chromium. It does not publish or
change the current checkout's dependencies.

For release changes, update `CHANGELOG.md` in the same pull request.

## Chart Idioms

Each idiom lives under `src/charts/<idiom>/` and exposes exactly one
`plugin.ts` (compiled to `plugin.js`):

```js
export const plugin = defineChartIdiom({
  key,
  createRenderer,
  createSpecCompiler,
  scenes,
  stateOperations
});
```

After adding or removing an idiom folder, run:

```sh
node scripts/sync-chart-manifest.mjs
```

Also update the lazy loader map in `src/runtime/chart-registry.ts`; the manifest
check requires the eager and lazy inventories to agree. Keep standalone loading
independent of Story and unrelated idioms, and cover that boundary in browser tests.

Do not add alias keys, empty hook bags, or mark-specific switch statements in
the transition runtime. Capabilities belong to the plugin.
