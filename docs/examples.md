# Live syntax examples

Every example on this page is editable in place. Change a method on the left and the real VisDelta output updates on the right. Each editor owns its own transition controller, error state, progress slider, playback, and computed delta; there is no separate source file to inspect.

## Mapping data and making immutable states

Start with one visualization, derive another, and return both endpoints. Try changing the fields, titles, keys, colors, or transition timing.

<SyntaxPlayground initial="measure" compact />

## Filtering with `.where()`

Edit the selector or combine constraints. This example also exercises the real Arquero transform path.

<SyntaxPlayground initial="filter" compact />

## Focusing the view with `.focus()`

Every row remains in the visualization. Only the visible positional range
changes, so the motion reads as a pan or zoom rather than an exit.

<SyntaxPlayground initial="focus" compact />

## Highlighting with `.highlight()`

All marks remain present while the unmatched subset is visually de-emphasized.

<SyntaxPlayground initial="highlight" compact />

## Detail with `.breakdown()` and `.rollup()`

Move between aggregate bars and segmented bars. Try changing the layout to `"grouped"`.

<SyntaxPlayground initial="split" compact />

## Axis and layout change with `.flip()`

Change orientation and experiment with the x/y step order.

<SyntaxPlayground initial="flip" compact />

## Line grammar

Edit `.curve()`, `.pointSize()`, or either encoded field.

<SyntaxPlayground initial="line" compact />

Continue with the [Line transition lab](/line-lab) for the sixteen editable
Line scenarios, including the staged cut → move → connect split and its exact
reverse merge.

## Point grammar

Edit quantitative channels, radius, color, or swap the axes.

<SyntaxPlayground initial="point" compact />

Continue with the [Point transition lab](/point-lab) for the complete editable
point transition matrix.

## Unit grammar

Edit unit count, columns, radius, label, or grouping.

<SyntaxPlayground initial="unit" compact />

## Local development

```sh
npm install
npm run build
npm run docs:dev
```

VitePress prints the local documentation URL. The docs use local search and require no hosted search service.
