// Keep these pairs aligned with tests/browser/line-lab.spec.mjs.
const base = `const rows = [
  { id: "Q1", period: "Q1", year: 2021, sales: 28, profit: 12 },
  { id: "Q2", period: "Q2", year: 2022, sales: 47, profit: 24 },
  { id: "Q3", period: "Q3", year: 2023, sales: 39, profit: 19 },
  { id: "Q4", period: "Q4", year: 2024, sales: 66, profit: 34 },
  { id: "Q5", period: "Q5", year: 2025, sales: 58, profit: 31 },
  { id: "Q6", period: "Q6", year: 2026, sales: 79, profit: 43 }
];

const base = line(rows)
  .x("period", { title: "Period" })
  .y("sales", { title: "Sales" })
  .key("id")
  .tooltip(["period", "sales", "profit"]);`;

const series = `const rows = [
  { id: "Q1-N", period: "Q1", region: "North", sales: 18 },
  { id: "Q1-S", period: "Q1", region: "South", sales: 10 },
  { id: "Q2-N", period: "Q2", region: "North", sales: 29 },
  { id: "Q2-S", period: "Q2", region: "South", sales: 18 },
  { id: "Q3-N", period: "Q3", region: "North", sales: 22 },
  { id: "Q3-S", period: "Q3", region: "South", sales: 17 },
  { id: "Q4-N", period: "Q4", region: "North", sales: 38 },
  { id: "Q4-S", period: "Q4", region: "South", sales: 28 },
  { id: "Q5-N", period: "Q5", region: "North", sales: 31 },
  { id: "Q5-S", period: "Q5", region: "South", sales: 27 },
  { id: "Q6-N", period: "Q6", region: "North", sales: 46 },
  { id: "Q6-S", period: "Q6", region: "South", sales: 33 }
];

const detailed = line(rows)
  .x("period", { title: "Period" })
  .y("sales", { title: "Sales" })
  .key(["period", "region"])
  .breakdown("region", {
    color: ["#1c6ae4", "#fa4d1d"]
  });

const total = detailed.rollup({ op: "sum" });`;

const filtered = `${base}

const filtered = base
  .where({ field: "id", oneOf: ["Q1", "Q2", "Q5", "Q6"] })
  .connect("adjacent");`;

const added = `${base}

const withQ7 = base.data([
  ...rows,
  { id: "Q7", period: "Q7", year: 2027, sales: 88, profit: 51 }
]);`;

const slidingWindow = `const rows = [
  { id: "Q1", period: "Q1", sales: 28 },
  { id: "Q2", period: "Q2", sales: 47 },
  { id: "Q3", period: "Q3", sales: 39 },
  { id: "Q4", period: "Q4", sales: 66 },
  { id: "Q5", period: "Q5", sales: 58 },
  { id: "Q6", period: "Q6", sales: 79 },
  { id: "Q7", period: "Q7", sales: 63 }
];

const firstWindow = line(rows.slice(0, 6))
  .x("period", { title: "Period" })
  .y("sales", { title: "Sales", domain: [0, 100] })
  .key("id")
  .curve("curveMonotoneX")
  .transition({ duration: 900, ease: "linear" });

const nextWindow = firstWindow.data(rows.slice(1));`;

function sample(id, label, description, setup, from, to) {
  return { id, label, description, code: `${setup}\n\nconst from = ${from};\nconst to = ${to};\n\nreturn { from, to };` };
}

export const chart = 'line';
export async function loadChart() {
  return (await import('../../dist/line.js')).line;
}

export const scenarios = [
  sample('x', '01 · Change x field', 'Move the same observations from named periods to a numeric year axis.', base, 'base', 'base.x("year", { type: "quantitative", title: "Year" })'),
  sample('y', '02 · Change y field', 'Keep the ordered periods and change the measured value.', base, 'base', 'base.y("profit", { title: "Profit" })'),
  sample('xy', '03 · Change both fields', 'Change both mappings while every observation keeps its id.', base, 'base', 'base.x("year", { type: "quantitative" }).y("profit")'),
  sample('filter', '04 · Filter observations', 'Points disappear first; then their connecting line retracts, leaving an honest gap.', filtered, 'base', 'filtered'),
  sample('restore', '05 · Restore observations', 'The exact reverse of filtering: the missing line reaches each observation before its point appears.', filtered, 'filtered', 'base'),
  sample('add', '06 · Add an observation', 'Extend the line to the new period first, then reveal its point.', added, 'base', 'withQ7'),
  sample('remove', '07 · Remove an observation', 'The exact reverse of adding: hide the point first, then retract the line.', added, 'withQ7', 'base'),
  sample('data', '08 · Update values', 'Replace measured values without changing observation identity or mappings.', base, 'base', 'base.data(rows.map((row, index) => ({ ...row, sales: row.sales + (index % 2 ? 9 : -5) })))'),
  sample('highlight', '09 · Highlight one series', 'Keep both series and dim the South series without filtering it out.', series, 'detailed', 'detailed.highlight({ region: "North" }, { opacity: 0.12 })'),
  sample('color', '10 · Change line color', 'Change a constant color without changing data or position.', base, 'base.color("#1c6ae4")', 'base.color("#fa4d1d")'),
  sample('style', '11 · Change line style', 'Change the D3 curve, line width, and point size as one visual state change.', base, 'base.curve("curveLinear").strokeWidth(2).pointSize(3)', 'base.curve("curveStep").strokeWidth(6).pointSize(7)'),
  sample('flip', '12 · Flip orientation', 'Move from a vertical value axis to a horizontal value axis, changing x before y.', base, 'base', 'base.flip({ order: ["x", "y"] })'),
  sample('split', '13 · Split into series', 'Cut the total line into colored pieces, move those pieces to each series, then connect them.', series, 'total', 'detailed'),
  sample('merge', '14 · Merge series', 'Use the exact reverse: disconnect, move back to the total, then join the pieces.', series, 'detailed', 'total'),
  sample('shift', '15 · Shift the time window', 'Remove the leaving point, move the shared observations, extend the line, then reveal the entering point.', slidingWindow, 'firstWindow', 'nextWindow'),
  sample('focus', '16 · Focus the view', 'Keep all observations and the full line, but fit the x-axis around the later years and clip what is outside.', base, 'base', 'base.focus("datum.year >= 2023")')
];
