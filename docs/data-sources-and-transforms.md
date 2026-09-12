# Data Sources & Transforms

VisDelta accepts tidy inline rows or a tidy data-source declaration on each
visualization, then applies chart-state operations during transition
compilation. D3 loads remote sources; Arquero is the current optional backend
for those state operations.

## Declaring datasets

The most direct form is an array of rows:

```js
const chart = bar()
  .data(rows)
  .x("decade")
  .y("count");
```

A `source` is one of:

| Form | Example | Behavior |
|---|---|---|
| Remote CSV | `{ url: "./data.csv", type: "csv" }` | Loaded with `d3.csv(url)` during transition initialization |
| Remote JSON | `{ url: "./data.json", type: "json" }` | Loaded with `d3.json(url)` during transition initialization |
| Inline rows (object form) | `{ values: [{ a: 1 }, { a: 2 }] }` | Used directly, no request |
| Inline rows (array form) | `[{ a: 1 }, { a: 2 }]` | Same as `{ values: [...] }` |

The same source declaration can be attached with `.data(source)`. For a named
source such as `bar("sales")`, pass the matching data map to
`transition(..., { data: { sales: rows } })`.

### Tidy data is the input contract

VisDelta's chart types expect **long ("tidy") data**: one row per
observation, with separate columns for the category, the measure, and the
value. Prepare, validate, and clean data before passing it to VisDelta. For
example:

```text
year,decade,period,type,count
1910,1910s,early,Hot days,7
1910,1910s,early,Cold days,16
```

### Field types are detected by Core

For tidy rows, VisDelta detects each field as `quantitative`, `temporal`, or
`nominal`. Finite numbers are quantitative. Valid JavaScript `Date` values and
ISO date strings such as `2026-01-31` are temporal. Other fields are nominal.
This applies both to inline rows and to data loaded from CSV or JSON.

```js
const prices = line(stock)
  .x("date")   // temporal, detected from the data
  .y("close"); // quantitative, detected from the data
```

Detection fills in missing information; it does not overrule the author. Use an
explicit type when a field should be read differently:

```js
line(rows).x("year", { type: "nominal" });
```

The Core exports `detectDataTypes(rows)` for inspection and
`resolveEncodingTypes(rows, encoding)` for custom chart modules. Detection is
not data cleaning: invalid or mixed fields stay nominal, and VisDelta does not
repair, reshape, or impute input data.

## The transform pipeline

Each view spec carries an optional `transform` array — a sequence of visual
state operations applied **in order** to tidy observations before they are
encoded and rendered. `applyTransforms(rows, transforms, aq)` runs this
pipeline using Arquero under the hood; you rarely call it directly — it's
an internal utility invoked by the renderer. Arquero is optional only when no
transforms are declared. Cached bar and point pair transitions evaluate transforms
during compilation and resize, not on every progress frame.

These operations express what a chart state shows: select observations, combine
them into summaries, order them, or limit the view. They are not a data-cleaning
pipeline. Parsing schemas, pivoting wide tables, joining sources, imputing
missing values, and correcting records belong upstream.

Most transforms get attached for you by chart methods (`.where()` →
`filter`, `.sort()` → `sort`, `.breakdown()`/`.rollup()` → `aggregate`, …).
You can also provide raw transform objects in a view spec when a builder
method doesn't cover your case; `.channel()` and `.axis()` are not transform
setters.

Each array entry must contain exactly one supported operation. Entries execute
in declared array order; unknown properties, operators and invalid values throw
an indexed error, even for empty data. See the [strict grammar reference](./data-transforms.md)
for the complete validation and missing-value rules.

### `filter`

Keeps rows matching a selector. This is a raw transform operation, not a
`.filter()` builder method. Bar, line, point and unit `.where()` compile row
filters. `.focus()` is the separate view operation that retains source rows.

```js
{ filter: { field: "type", equal: "Hot days" } }
{ filter: { field: "year", gte: 1980, lte: 2020 } }
{ filter: { field: "type", oneOf: ["Hot days", "Cold days"] } }
{ filter: "datum.year >= 1980" }   // string expression form
```

Selector operators: `equal`, `notEqual`, `oneOf` (array membership), `gte`,
`gt`, `lte`, `lt`. You can combine multiple operators in one selector object
(all must pass). String expressions support a single comparison of the form
`datum.<field> <op> <literal>` where `<op>` is one of `== === != !== >= > <= <`
and `<literal>` is a quoted string, finite JSON number, boolean or null.
Range bounds may be finite numbers, valid `Date` values, or ISO date strings.
Date values and ISO strings compare by time. Other equality comparisons remain
strict; arithmetic, logical expressions and function calls are not supported.

### `timeUnit`

Derives a calendar-unit label from a date field. Currently supports
`unit: "month"`, producing short month names (`"Jan"`, `"Feb"`, …) via
`Date#toLocaleString`.

```js
{ timeUnit: { field: "observedAt", unit: "month", as: "month" } }
// as defaults to `${field}_${unit}` if omitted
```

### `bin`

Buckets a quantitative field into ranges, producing a categorical label plus
numeric bounds.

```js
{ bin: { field: "temperature", maxbins: 8, as: "tempBin" } }
// or fixed bin width:
{ bin: { field: "temperature", step: 5, as: "tempBin" } }
```

Produces three derived columns: `<as>` (a `"start-end"` label string),
`<as>_start`, and `<as>_end` (numeric bounds). `step` takes precedence over
`maxbins` (default `10`) when both are given; otherwise the bin width is
computed as `max(1, ceil((max - min) / maxbins))`. This keeps constant data
finite; nonnumeric values produce null bounds and labels.

### `aggregate`

Groups rows and computes summary statistics — the engine behind
`.breakdown()`/`.rollup()`'s `op`/`groupby`/`as` options.

```js
{
  aggregate: {
    groupby: ["decade", "type"],
    fields: [
      { op: "sum", field: "count", as: "total" },
      { op: "mean", field: "count", as: "average" },
      { op: "count", as: "n" }
    ]
  }
}
```

Supported `op` values: `count`, `sum`, `mean`, `min`, `max`, `median`. `field`
is required for every op except `count`. If `as` is omitted, it defaults to
`<op>_<field-or-"rows">`.

### `sort`

Orders rows — the transform `.sort(field, order)` appends.

```js
{ sort: { field: "year", order: "ascending" } }     // or "descending"
{ sort: { fields: [{ field: "decade" }, { field: "count", order: "descending" }] } } // multi-key sort
```

### `limit`

Truncates to the first `n` rows after all preceding transforms run:

```js
{ limit: 10 }
{ limit: 0 } // valid: no rows
```

## Putting it together

A spec's `transform` array composes naturally — e.g. filter, then aggregate,
then sort:

```js
{
  transform: [
    { filter: { field: "period", equal: "recent" } },
    { aggregate: { groupby: ["decade", "type"], fields: [{ op: "sum", field: "count", as: "count" }] } },
    { sort: { field: "decade" } }
  ]
}
```

When authoring through the chart builders, you'll rarely hand-write this —
`.where()`, `.breakdown()`, `.rollup()`, and `.sort()` build it
for you, in the right order, while also updating encodings, keys, and titles
to match.
