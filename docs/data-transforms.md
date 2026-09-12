# Data transform grammar

VisDelta implements a small declarative transform language, not arbitrary
JavaScript, SQL, or the full Vega transform vocabulary. Transform arrays execute
in declared order. Every entry has exactly one supported operation; unsupported
operations, properties, or values throw an error with the `transform[index]`.
Validation also runs for empty datasets.

| Operation | Configuration |
| --- | --- |
| `filter` | `{ field, equal?, notEqual?, oneOf?, gt?, gte?, lt?, lte? }`, or a scalar comparison expression |
| `sort` | `{ field, order? }` or `{ fields: [fieldName, { field, order? }, …] }` |
| `limit` | A non-negative integer; zero produces no rows |
| `aggregate` | `{ groupby?: string[], fields?: [{ op?, field?, as? }] }` |
| `bin` | `{ field, as?, step?, maxbins? }` |
| `timeUnit` | `{ field, unit: "month", as? }`; no other unit is currently supported |

All transforms currently use Arquero. With no transforms, Arquero is optional.
Source rows are copied; sparse rows use the union of their keys when creating a
table, rather than discarding columns missing from the first row.

## Filters

Multiple comparisons on one field are ANDed. `oneOf` must be an array; numeric
bounds must be finite numbers. Missing, null, NaN, empty-string and boolean values
do not satisfy numeric range tests. Numeric strings retain numeric comparison
behavior. Equality is strict, without string/number coercion.

```js
{ filter: { field: "sales", gte: 0, lt: 100 } }
{ filter: { field: "country", oneOf: ["France", "Australia"] } }
{ filter: 'datum.sales >= 20' }
{ filter: 'datum.country === "France"' }
```

Expression syntax is exactly `datum.field <operator> literal`. Operators are
`==`, `===`, `!=`, `!==`, `>`, `>=`, `<`, `<=`. Literals are quoted strings,
finite JSON numbers, booleans or null; numeric range bounds remain numeric.
Both equality spellings are strict. No functions, arithmetic, logical operators,
property traversal or unquoted string literals are evaluated. For conjunction
across fields, use consecutive filter entries.

Built-in `.where('datum.sales >= 20')` parses the same comparison. Bar also
accepts multi-field equality shorthand such as `.where({ region: "EU", year: 2025 })`.
Other chart types' selector shorthand accepts one field at a time. `.where()`
always removes nonmatching rows; use `.focus()` to keep the rows and change only
the visible coordinate range.

## Aggregates, bins and time

Aggregate operators are `count`, `sum`, `mean`, `min`, `max`, and `median`.
The default is count; non-count operators require a field. Unknown names such as
`average` are errors, not aliases for sum. Omitted `fields` defaults to count.

`bin.step` must be positive and finite; `maxbins` a positive integer. Inferred
steps retain the integer-width heuristic with a minimum width of one, so constant
numeric data forms a finite bin rather than dividing by zero. Empty input stays
empty. Nonnumeric values get null start/end/label fields. This is not a statistical
optimal-binning algorithm.

`timeUnit: "month"` derives English abbreviated month labels using the runtime's
local timezone. Invalid date values retain their string form. There is no implicit
UTC conversion or support for other calendar units in this release.

These stricter errors intentionally replace silent acceptance in earlier builds.
Correct invalid declarations instead of relying on the previous fallback results.
