const base = `const rows = [
  { id: "Q1", period: "Q1", year: 2021, sales: 28, profit: 12 },
  { id: "Q2", period: "Q2", year: 2022, sales: 47, profit: 24 },
  { id: "Q3", period: "Q3", year: 2023, sales: 39, profit: 19 },
  { id: "Q4", period: "Q4", year: 2024, sales: 66, profit: 34 },
  { id: "Q5", period: "Q5", year: 2025, sales: 58, profit: 31 },
  { id: "Q6", period: "Q6", year: 2026, sales: 79, profit: 43 }
];

const base = area(rows)
  .x("period", { title: "Period" })
  .y("sales", { title: "Sales" })
  .key("id")
  .tooltip(["period", "sales", "profit"]);`;

const stacked = `const rows = [
  { period: "Q1", region: "North", sales: 18 },
  { period: "Q1", region: "South", sales: 10 },
  { period: "Q2", region: "North", sales: 29 },
  { period: "Q2", region: "South", sales: 18 },
  { period: "Q3", region: "North", sales: 22 },
  { period: "Q3", region: "South", sales: 17 },
  { period: "Q4", region: "North", sales: 38 },
  { period: "Q4", region: "South", sales: 28 },
  { period: "Q5", region: "North", sales: 31 },
  { period: "Q5", region: "South", sales: 27 },
  { period: "Q6", region: "North", sales: 46 },
  { period: "Q6", region: "South", sales: 33 }
];

const detailed = area(rows)
  .x("period", { title: "Period" })
  .y("sales", { title: "Sales" })
  .key(["period", "region"])
  .breakdown("region", {
    color: ["#1c6ae4", "#fa4d1d"]
  });

const total = detailed.rollup({ op: "sum" });`;

const filtered = `${base}

const filtered = base.where({
  field: "id",
  oneOf: ["Q1", "Q2", "Q5", "Q6"]
});`;

const added = `${base}

const withQ7 = base.data([
  ...rows,
  { id: "Q7", period: "Q7", year: 2027, sales: 88, profit: 51 }
]);`;

function sample(id, label, description, setup, from, to) {
  return { id, label, description, code: `${setup}\n\nconst from = ${from};\nconst to = ${to};\n\nreturn { from, to };` };
}

export const chart = 'area';
export async function loadChart() {
  return (await import('../../dist/area.js')).area;
}

export const scenarios = [
  sample('x', '01 · Change x field', 'Move the same band from named periods to a numeric year axis.', base, 'base', 'base.x("year", { type: "quantitative", title: "Year" })'),
  sample('y', '02 · Change y field', 'Keep the ordered periods and change the upper boundary measure.', base, 'base', 'base.y("profit", { title: "Profit" })'),
  sample('filter', '03 · Filter observations', 'Remove middle observations and preserve the honest gap as two connected areas.', filtered, 'base', 'filtered'),
  sample('restore', '04 · Restore observations', 'Restore the filtered observations and their part of the area.', filtered, 'filtered', 'base'),
  sample('add', '05 · Add an observation', 'Extend the area to one new keyed period.', added, 'base', 'withQ7'),
  sample('remove', '06 · Remove an observation', 'Remove the final keyed period from the area.', added, 'withQ7', 'base'),
  sample('data', '07 · Update values', 'Move the upper boundary while keeping observation identity.', base, 'base', 'base.data(rows.map((row, index) => ({ ...row, sales: row.sales + (index % 2 ? 9 : -5) })))'),
  sample('highlight', '08 · Highlight one layer', 'Keep both stacked layers and dim the South region.', stacked, 'detailed', 'detailed.highlight({ region: "North" }, { opacity: 0.12 })'),
  sample('color', '09 · Change fill color', 'Change a constant fill without changing the area geometry.', base, 'base.color("#1c6ae4")', 'base.color("#fa4d1d")'),
  sample('baseline', '10 · Change baseline', 'Move the lower boundary from zero to twenty.', base, 'base', 'base.baseline(20)'),
  sample('focus', '11 · Focus the view', 'Keep every observation while fitting the x view around later years.', base, 'base', 'base.focus("datum.year >= 2023")'),
  sample('split', '12 · Split into stacked areas', 'Draw the internal boundary through the total, then reveal the colored parts.', stacked, 'total', 'detailed'),
  sample('merge', '13 · Merge stacked areas', 'Hide the parts and erase the same internal boundary in exact reverse.', stacked, 'detailed', 'total'),
  sample('curve', '14 · Change curve', 'Shape both Area boundaries with an exact D3 curve name.', base, 'base.curve("curveLinear")', 'base.curve("curveMonotoneX")')
];
