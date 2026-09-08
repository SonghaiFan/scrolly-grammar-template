# Live syntax examples

Every example on this page is editable in place. Change a method on the left and the real ScrollyLite output updates on the right. Each editor owns its own transition controller, error state, progress slider, playback, and computed delta; there is no separate source file to inspect.

## Encoding and immutable states

Start with one visualization, derive another, and return both endpoints. Try changing the fields, titles, keys, colors, or transition timing.

<SyntaxPlayground initial="measure" compact />

## Filtering with `.where()`

Edit the selector or combine constraints. This example also exercises the real Arquero transform path.

<SyntaxPlayground initial="filter" compact />

## Focus with `.highlight()`

All marks remain present while the unmatched subset is visually de-emphasized.

<SyntaxPlayground initial="highlight" compact />

## Granularity with `.breakdown()` and `.rollup()`

Move between aggregate bars and segmented bars. Try changing the layout to `"grouped"`.

<SyntaxPlayground initial="split" compact />

## Guide change with `.flip()`

Change orientation and experiment with the staging order.

<SyntaxPlayground initial="flip" compact />

## Line grammar

Edit `.curve()`, `.pointSize()`, or either encoded field.

<SyntaxPlayground initial="line" compact />

## Point grammar

Edit quantitative channels, radius, color, or swap the axes.

<SyntaxPlayground initial="point" compact />

## Unit grammar

Edit unit count, columns, radius, label, or grouping.

<SyntaxPlayground initial="unit" compact />

## `seq()` composition

Seq stores an ordered set of visualization snapshots. Here its first two entries become the editable transition endpoints.

<SyntaxPlayground initial="seq" compact />

## `story()` composition

Story adds narrative metadata and layout composition. The preview extracts its two compiled step views so you can inspect the resulting transition directly.

<SyntaxPlayground initial="story" compact />

## Local development

```sh
npm install
npm run build
npm run docs:dev
```

VitePress prints the local documentation URL. The docs use local search and require no hosted search service.
