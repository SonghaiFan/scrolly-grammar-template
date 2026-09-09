# Migrating to 0.2

0.2.0 is prepared in this checkout and is not yet published. The following is
the migration contract for the candidate, not a claim about 0.1.1 behavior on a
live CDN. Use matching package, JavaScript and CSS versions.

## Package rename and new core boundary

The npm identity changes from `scrollylite` to `visdelta`; the browser global
changes from `ScrollyLite` to `VisDelta`, with `vd` as its short alias. Generated
bundle and stylesheet names change from `scrollylite.*` to `visdelta.*`.

This is also an ownership change. Story, Seq, page layouts, navigation, theme
mounting, and native scrolling moved to the private
`@visdelta/scrollytelling` package in this repository. They are not exported by
VisDelta and will later be integrated into ScrollyTale.

## Standalone transitions

Chart declarations remain chainable and immutable. Zero-argument factories now
support deferred `.data(source)`, and rebinding replaces the previous complete
data source. Two same-idiom declarations can be passed directly to
`transition(from, to, options)` without Story, Seq or scrolling.

```js
import { bar } from 'visdelta/bar';
import { transition } from 'visdelta/transition';
const first = bar().data(rows).x('category').y('sales').key('category');
const second = first.y('profit');
const change = await transition(first, second, { target: '#chart', d3 });
change.progress(0.5);
// On unmount:
change.destroy();
```

`visdelta/core` contains DOM-free normalization and delta operations.
`visdelta/bar`, `/transition`, and `/plugins` are focused public entries. The
root exports visualization authoring, delta, transition, and plugin APIs; it no
longer exports `story`, `seq`, `chart`, `page`, `render`, `createStory`,
`createChart`, or `createPage`. The browser adapter delegates to the same core
implementation and can resolve D3/Arquero from browser globals; canonical ESM
requires explicit dependencies.

Arquero is optional only if no transforms are declared. Filters, sort, fold,
aggregate, bin and timeUnit currently require `{ aq }`. D3 is still required
for rendering. Neither dependency is included in the focused bundle sizes.

## Strict grammar replaces silent acceptance

- Use one operation per transform entry: `[{ filter: ... }, { sort: ... }]`,
  not `[{ filter: ..., sort: ... }]`.
- Unknown operations/properties and invalid values throw with `transform[index]`,
  even for empty data. Only month is supported by `timeUnit`; `average` is not an
  aggregate operator (use `mean`).
- `{ limit: 0 }` now produces an empty result. Constant bins have finite width;
  nonnumeric bin values get null bounds/labels.
- Multiple comparisons on a filter field are ANDed. Numeric filters exclude
  null/missing/NaN/empty-string/boolean values. Equality is strict.
- String selectors use only `datum.field <operator> scalarLiteral`, not arbitrary
  JavaScript. Bar accepts multi-field equality shorthand; line/point/unit accept
  one shorthand field per selector. Line's default `.where()` crops its visible
  range while retaining data rows.

See [Data Transform Grammar](./data-transforms.md) for the full supported syntax.
Scene inference now depends on endpoint semantics, not the operations used to
derive them. Equivalent endpoints no longer get different inferred scenes solely
because their method-call histories differ.

## Ownership and cleanup

- Transition color tokens resolve from the target rather than requiring
  `document.documentElement` mutation. Set CSS custom properties on each target
  when surfaces need different palettes.
- External stylesheets remain document-wide. Shared links are reference counted;
  application-owned links are never removed. Use scoped CSS for different themes.
- Destroy before reusing a host. Pair destroy removes its mounted transition
  markup and is idempotent; controller methods reject use after destruction.
- Failed initial mounts preserve the original host nodes, listeners, class and
  theme. This does not revive an already destroyed runtime.
Story/Seq lifecycle and scrolling notes now belong to the extracted adapter's
own documentation.

## Explicit limits of this release

Standalone transitions require the same idiom at both endpoints. Bar caches
interpolation tracks and reuses nodes; line/point/unit reconstruct on seek.
The bar compilation path still reads D3 transition schedules. This is covered
by regression tests against the installed dependency version, not a guarantee
against every future D3 internal change. Only bar has visual highlight support.

Only bar has a focused authoring entry. The full root/global entry is not a
minimal bundle. Code splitting is needed to preserve lazy loading in a bundled
consumer. Theme/layout changes require `resize()` to rebuild cached frames.
See [Module Boundaries](./modular-architecture.md) and
[Transition Contract](./visualization-transitions.md) for the remaining scope.
