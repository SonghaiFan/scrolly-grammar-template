# ScrollyLite

Declarative visualization grammar for browser ESM, with chainable chart states
and animated transitions between them. Derive one visualization from another,
then play the change or seek any progress value. Stories compose these states
into narrated steps with sticky visualizations and scroll interaction.

This checkout prepares **0.2.0**. Versioned install/CDN snippets below target
that candidate and become available after publication. For pre-release testing,
build locally or install a locally packed tarball; no npm publication is implied.

```js
const spec = story()
  .data("weatherDays", { url: "./weather_days_tidy.csv", type: "csv" })
  .layout("floatToText")
  .add("Baseline",     bar("weatherDays").x("decade").y("count").key("decade"))
  .add("Focus",        bar("weatherDays").x("decade").y("count").key("decade").where({ period: "recent" }))
  .add("Granularity",  bar("weatherDays").x("decade").y("count").key("decade").breakdown("type"))
  .toSpec();

await createStory(spec, { target: "#app", d3, aq });
```

You write *what* each step looks like — ScrollyLite diffs consecutive steps,
infers what changed (filter? re-orientation? aggregation level? encoded
field?), and animates the transition for you.

📖 **[Open the interactive reference](docs/reference.md)**

## Standalone visualization transitions

Derive a visualization from an existing one, then play or seek the change directly:

```js
import { bar } from "scrollylite/bar";
import { transition } from "scrollylite/transition";

const bar1 = bar().data(rows).x("country").y("sales").key("country");
const bar2 = bar1.y("profit");
const change = await transition(bar1, bar2, { target: "#chart", d3 });
change.progress(0.37);
change.play({ duration: 800 });
```

The focused subpath imports keep authoring and transitions separate from the Story
composition API. Arquero is only needed when a visualization declares data transforms.
No Story or Step is required.
The runtime loads only the selected chart idiom; `scrollylite/plugins` supports
custom registration without importing Story. See [module boundaries and remaining
cleanup](docs/modular-architecture.md) for measured sizes and current limitations.
Built-in bar transitions compile and cache interpolation tracks once; playback
and progress reuse SVG nodes. Call `change.resize()` after changing size or theme.
See [Visualization Transitions](docs/visualization-transitions.md) for the contract,
data sources, lifecycle, and current performance boundary, or try
[`examples/transition/`](examples/transition/index.html) locally after building.

## Install

Use your package manager, the same way you would install D3:

```sh
npm install scrollylite@0.2.0 d3 arquero
```

```sh
yarn add scrollylite@0.2.0 d3 arquero
```

```sh
pnpm add scrollylite@0.2.0 d3 arquero
```

Then import ScrollyLite, D3, and Arquero explicitly:

```js
import * as d3 from "d3";
import * as aq from "arquero";
import { createStory, story, bar } from "scrollylite";
import "scrollylite/style.css";
// Optional: import "scrollylite/themes/default.css";

const spec = story()
  .data("rows", {
    values: [
      { category: "A", value: 12 },
      { category: "B", value: 18 },
      { category: "C", value: 9 }
    ]
  })
  .view("main", { height: 520 })
  .add("Baseline", bar("rows").x("category").y("value").key("category"))
  .add(
    "Highlight B",
    bar("rows").x("category").y("value").key("category")
      .highlight({ category: "B" })
  )
  .toSpec();

await createStory(spec, { target: "#app", d3, aq });
```

## Browser ESM from a CDN

For vanilla HTML, use a module script. ScrollyLite's built ESM entry is served
directly from the package; D3 and Arquero use jsDelivr's `+esm` endpoints.

```html
<div id="app"></div>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.2.0/dist/scrollylite.css">
<script type="module">
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as aq from "https://cdn.jsdelivr.net/npm/arquero@8/+esm";
import { createStory, story, bar } from "https://cdn.jsdelivr.net/npm/scrollylite@0.2.0/dist/scrollylite.esm.js";

const spec = story()
  .title("Revenue")
  .data("rows", {
    values: [
      { category: "A", value: 12 },
      { category: "B", value: 18 },
      { category: "C", value: 9 }
    ]
  })
  .view("main", { height: 420 })
  .add("Baseline", bar("rows").x("category").y("value").key("category"))
  .add(
    "Highlight B",
    bar("rows").x("category").y("value").key("category")
      .highlight({ category: "B" })
  )
  .toSpec();

await createStory(spec, { target: "#app", d3, aq });
</script>
```

Pin exact versions in production. `latest` URLs are convenient for experiments
but bad for durable stories.

`rows` is a dataset name. `.data("rows", ...)` defines it; `bar("rows")`
uses it.

The ESM entry follows D3's explicit dependency style: import the packages you
need and pass `d3` and `aq` to `createStory()`.

## Plain script fallback

If you cannot use module scripts, load the global bundle instead:

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/arquero@8/dist/arquero.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/scrollylite@0.2.0/dist/scrollylite.global.js"></script>
```

The global build exposes `window.ScrollyLite` and falls back to
`globalThis.d3` / `globalThis.aq` when `createStory()` runs.

## Public API

The full package exports authoring, rendering and composition APIs. For small
bundles prefer the [focused entry points](docs/modular-architecture.md):

```js
import {
  createStory,        // async (spec, { target, d3, aq, debug }) => StoryRuntime
  createChart, createPage, chart, page, render,
  transition,         // async (from, to, { target, d3, aq }) => seekable controller
  delta, diffViewStates, visualizationSpec,
  seq, Seq,
  story,              // chainable story-spec authoring builder
  bar, line, point, unit,            // chainable chart-idiom builders (the only built-ins — no aliases)
  defineChartIdiom,   // define a custom chart idiom plugin
  registerChartIdiom, // register a custom idiom at runtime
  registerChartModule,
  availableChartIdioms
} from "scrollylite";
```

Type definitions ship with the package at `dist/index.d.ts`. For the full
reference — every chainable method, every config option, the runtime object
shape, delta semantics, transition planning, and plugin boundaries, see the
**[interactive reference](docs/reference.md)**.

## Development

Serve the demo:

```sh
python3 -m http.server 5510
```

Then open:

```text
http://localhost:5510/examples/weather/
```

Build the CDN-ready files:

```sh
npm run build
npm run smoke
```

The build writes:

- `dist/scrollylite.esm.js`
- `dist/scrollylite.browser.js`
- `dist/scrollylite.global.js`
- `dist/index.d.ts`
- `dist/browser.d.ts`
- `dist/scrollylite.css`
- `dist/themes/default.css`
- copied ESM modules under `dist/`

## Architecture

The runtime has four clean layers:

- `src/grammar/`: chainable story and idiom authoring API.
- `src/charts/`: chart idiom plugins, renderers, compilers, state, and keys.
- `src/transitions/`: scene inference and spec compilation from plugin
  capabilities.
- `src/scrollylite.ts`: story lifecycle, data loading, layout, scene rendering,
  scroll control, and cleanup.

Each idiom exposes one plugin:

```js
export const plugin = defineChartIdiom({
  key: "point",
  createRenderer,
  createSpecCompiler,
  scenes: ["focus", "guide", "granularity", "observation"],
  stateOperations: {
    focus: "filter",
    guide: "coordinate",
    granularity: "aggregate"
  },
  transition: {
    plan,
    intermediateSpecs
  },
  defaults: { margin }
});
```

The runtime idiom is flat: `key`, `renderer`, `prepareSpec`,
`resolveTransitionPlan`, `intermediateSpecs`, `defaultMargin`, `inspect`,
`scenes`, and `stateOperations`.

See [Extending with Plugins](docs/extending-with-plugins.md) for a full guide
to authoring and registering your own chart idiom.

## Publish

Release flow:

Use Node 20+ for maintenance/release tooling (CI uses Node 22). The published
package retains Node 18 consumer support, checked separately via its tarball;
Playwright is a development-only dependency.

```sh
npx playwright install chromium
npm run release:check
npm publish
git push --follow-tags
```

Before publication, finalize the candidate's version/date and maintainer notes,
review and commit the intended files, then create the matching version tag.
Do not bump 0.2.0 again merely to publish this prepared candidate. `npm publish` runs
`npm run release:check` automatically, including real-browser regressions and an
installed tarball consumer check. On a development machine with Chrome already
installed, `SCROLLYLITE_CHROME_PATH` can point to its executable instead of
installing Playwright's Chromium. Choose the version bump deliberately: the
API additions and stricter validation are not merely a docs patch. Historical
migration and release acceptance files are maintainer records, not the public
language reference.

jsDelivr can serve npm packages with:

```text
https://cdn.jsdelivr.net/npm/scrollylite@0.2.0/dist/scrollylite.esm.js
https://cdn.jsdelivr.net/npm/scrollylite@0.2.0/dist/scrollylite.browser.js
https://cdn.jsdelivr.net/npm/scrollylite@0.2.0/dist/scrollylite.global.js
```

It can also serve tagged GitHub releases:

```text
https://cdn.jsdelivr.net/gh/SonghaiFan/scrollylite@0.2.0/dist/scrollylite.esm.js
```

For GitHub CDN links, commit `dist/` before tagging because GitHub CDN does not
run the build step for you.

## Docs

The documentation site is built with [VitePress](https://vitepress.dev/). Start
the local authoring server with:

```sh
npm run docs:dev
```

VitePress prints the local URL in the terminal. Build and inspect the exact
static output with:

```sh
npm run docs:build
npm run docs:preview
```

Set `DOCS_BASE=/scrollylite/` when building for a subpath deployment such as
GitHub Pages. Without an override, the generated site is also reachable from
the repository homepage when this checkout is served by a plain static server.

Start with the **[language framework and roadmap](docs/language-framework.md)**.
It is the source of truth for ontology, grammar families, idiom coverage,
implementation status, missing capabilities, and development order.

Then use the **[interactive reference](docs/reference.md)**. It is the
canonical public map of the 0.2 language and includes a live seekable runtime,
code, delta inspection, complete public method tables, lifecycle contracts, and
current limitations.

Then pick the focused guide that matches how you're using ScrollyLite:

- [`docs/for-cdn-users.md`](docs/for-cdn-users.md): **browser ESM, no build tools** — paste a module script into any page and go. Start here if you're not running npm/bundlers.
- [`docs/for-developers.md`](docs/for-developers.md): **npm/bundler projects & contributors** — install, architecture, scripts, release flow, extending the library.
- [`llms.txt`](llms.txt): **AI agents / LLMs** — a dense, single-file reference covering the entire grammar and API, written for machine consumption.

The written guides below expand individual areas. They use the same current
grammar as the interactive reference:

- [`docs/getting-started.md`](docs/getting-started.md): package-manager install, browser ESM CDN usage, a full working example, and what `createStory` does.
- [`docs/concepts.md`](docs/concepts.md): the mental model — Story, Step, View, Idiom, Scene, semantic identity (`key`).
- [`docs/story-builder.md`](docs/story-builder.md): the chainable `story()` API — `.data()`, `.layout()`, `.view()`, `.add()`, `.toSpec()`, and reusable/branching narrative patterns.
- [`docs/chart-idioms.md`](docs/chart-idioms.md): every chart idiom (`bar`, `line`, `point`, `unit`) and every chainable method/option, with examples.
- [`docs/data-sources-and-transforms.md`](docs/data-sources-and-transforms.md): declaring datasets and the transform pipeline (filter, fold, bin, aggregate, sort, …).
- [`docs/layouts-themes-and-scrolling.md`](docs/layouts-themes-and-scrolling.md): layout presets, the `offset`/`scroll` config, step actions, and theming.
- [`docs/scenes-and-transitions.md`](docs/scenes-and-transitions.md): how ScrollyLite infers and animates `focus`/`observation`/`granularity`/`guide` transitions.
- [`docs/runtime-api.md`](docs/runtime-api.md): `createStory()`, the returned `StoryRuntime`, and driving stories programmatically.
- [`docs/extending-with-plugins.md`](docs/extending-with-plugins.md): defining and registering your own chart idiom with `defineChartIdiom`.
- [`src/charts/README.md`](src/charts/README.md): folder contract for built-in chart idioms.

## License

MIT
