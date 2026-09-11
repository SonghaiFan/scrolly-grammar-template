// Keep these pairs aligned with tests/browser/transition.spec.mjs.
const basic = `const rows = [
  { category: "A", value: 10, other: 35, type: "one" },
  { category: "B", value: 30, other: 5, type: "two" },
  { category: "C", value: 20, other: 15, type: "one" }
];

const base = bar().data(rows)
  .x("category").y("value").key("category");`;

const segmented = `const rows = [
  { category: "A", type: "one", value: 10 },
  { category: "A", type: "two", value: 20 },
  { category: "B", type: "one", value: 30 },
  { category: "B", type: "two", value: 15 }
];

const detailed = bar().data(rows)
  .x("category").y("value").key("category")
  .breakdown("type")
  .color("type");`;

function sample(id, label, description, setup, from, to) {
  return { id, label, description, code: `${setup}\n\nconst from = ${from};\nconst to = ${to};\n\nreturn { from, to };` };
}

export const chart = 'bar';
export async function loadChart() {
  return (await import('../../dist/bar.js')).bar;
}

export const scenarios = [
  sample('measure', '01 · Change measure', 'Keep the same categories and change the y field from value to other.', basic, 'base', 'base.y("other")'),
  sample('filter', '02 · Filter members', 'Keep type one. B exits; drag back to restore it.', basic, 'base', 'base.where({ type: "one" })'),
  sample('highlight', '03 · Highlight', 'Emphasize B while keeping all three categories in the data.', basic, 'base', 'base.highlight({ category: "B" })'),
  sample('color', '04 · Change color', 'Change a constant color without changing the data or encoding fields.', basic, 'base.color("#336699")', 'base.color("#cc6633")'),
  sample('sort', '05 · Reorder bars', 'Sort by value descending. Keys identify bars as they move.', basic, 'base', 'base.sort("value", "descending")'),
  sample('flip', '06 · Flip orientation', 'Move from vertical to horizontal bars.', basic, 'base', 'base.flip()'),
  sample('data', '07 · Update values', 'Replace the data, retaining the value encoding and category keys.', basic, 'base', 'base.data(rows.map(row => ({ ...row, value: row.other })))'),
  sample('split', '08 · Split into stacked segments', 'Draw the final cutlines through each total, then reveal the stacked segment colors.', segmented, 'detailed.rollup()', 'detailed'),
  sample('merge', '09 · Merge stacked segments', 'Aggregate the detailed segments into one total per category.', segmented, 'detailed', 'detailed.rollup()'),
  sample('layout', '10 · Stacked → grouped', 'Keep the detailed data and change how segments are positioned.', segmented, 'detailed', 'detailed.layout("grouped")'),
  sample('grouped-split', '11 · Split into grouped segments', 'Move from category totals to side-by-side detail.', segmented, 'detailed.rollup()', 'detailed.layout("grouped")'),
  sample('grouped-merge', '12 · Merge grouped segments', 'Move from side-by-side detail back to category totals.', segmented, 'detailed.layout("grouped")', 'detailed.rollup()'),
  sample('focus', '13 · Focus the view', 'Keep all three bars in the data while fitting the category view around A and B. C moves beyond the clipped plot instead of exiting.', basic, 'base', 'base.focus({ field: "category", oneOf: ["A", "B"] })')
];
