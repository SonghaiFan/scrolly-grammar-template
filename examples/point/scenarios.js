// Keep these pairs aligned with tests/browser/point-lab.spec.mjs.
const base = `const rows = [
  { id: "A", place: "Aster", region: "North", income: 42, education: 58, health: 66, happiness: 54, population: 18 },
  { id: "B", place: "Birch", region: "South", income: 57, education: 49, health: 61, happiness: 68, population: 31 },
  { id: "C", place: "Cedar", region: "North", income: 68, education: 72, health: 78, happiness: 74, population: 24 },
  { id: "D", place: "Dune", region: "South", income: 76, education: 64, health: 70, happiness: 63, population: 42 },
  { id: "E", place: "Elm", region: "North", income: 51, education: 81, health: 73, happiness: 82, population: 36 },
  { id: "F", place: "Flint", region: "South", income: 84, education: 77, health: 86, happiness: 79, population: 27 }
];

const base = point(rows)
  .x("income", { title: "Income" })
  .y("health", { title: "Health" })
  .key("id")
  .tooltip(["place", "region", "income", "health"]);`;

function sample(id, label, description, setup, from, to) {
  return { id, label, description, code: `${setup}\n\nconst from = ${from};\nconst to = ${to};\n\nreturn { from, to };` };
}

const summarySetup = `${base}

const detailed = base.color("region");
const summary = detailed.rollup("region", {
  key: "region",
  sizeRange: [10, 24],
  x: { op: "mean" },
  y: { op: "mean" }
});`;

export const pointScenarios = [
  sample('x', '01 · Change x field', 'Keep the same points and move them to a different horizontal measure.', base, 'base', 'base.x("education", { title: "Education" })'),
  sample('y', '02 · Change y field', 'Keep the same points and move them to a different vertical measure.', base, 'base', 'base.y("happiness", { title: "Happiness" })'),
  sample('xy', '03 · Change both fields', 'Change both position mappings while each point keeps its identity.', base, 'base', 'base.x("education").y("happiness")'),
  sample('filter', '04 · Filter points', 'Keep the North region. South points exit and return when you scrub backward.', base, 'base', 'base.where({ region: "North" })'),
  sample('add', '05 · Add a point', 'Add one new place while the six existing points stay matched by id.', base, 'base', `base.data([...rows, {
  id: "G", place: "Grove", region: "North",
  income: 63, education: 69, health: 81,
  happiness: 76, population: 22
}])`),
  sample('data', '06 · Update values', 'Replace the data values while keeping point identity and mappings.', base, 'base', `base.data(rows.map((row, index) => ({
  ...row,
  income: row.income + (index % 2 ? 8 : -6),
  health: row.health + (index % 3 - 1) * 7
})))`),
  sample('highlight', '07 · Highlight points', 'Keep every point visible and fade the region outside the focus.', base, 'base', 'base.highlight({ region: "North" }, { opacity: 0.12 })'),
  sample('color', '08 · Map color', 'Introduce a categorical color mapping without changing position.', base, 'base', 'base.color("region")'),
  sample('size', '09 · Map size', 'Map population to point radius using an explicit visual range.', base, 'base.radius(6)', 'base.size("population", { range: [5, 18] })'),
  sample('flip', '10 · Swap x and y', 'Swap the axes and move the points with their changing scales and labels.', base, 'base', 'base.flip({ order: ["x", "y"] })'),
  sample('rollup', '11 · Combine into summaries', 'Gather detailed places into one mean-position summary circle per region.', summarySetup, 'detailed', 'summary'),
  sample('breakdown', '12 · Reveal detail', 'Reverse the same path: split each regional summary into its places.', summarySetup, 'summary', 'detailed')
];
