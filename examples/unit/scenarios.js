const base = `const rows = [
  { id: "A1", team: "Alpha", region: "North", year: 2021, count: 8 },
  { id: "A2", team: "Alpha", region: "South", year: 2022, count: 5 },
  { id: "B1", team: "Beta", region: "North", year: 2023, count: 10 },
  { id: "B2", team: "Beta", region: "South", year: 2024, count: 7 },
  { id: "C1", team: "Gamma", region: "North", year: 2025, count: 6 },
  { id: "C2", team: "Gamma", region: "South", year: 2026, count: 9 }
];

const base = unit(rows)
  .value("count", { maxUnits: 100 })
  .key("id")
  .layout("grid", { columns: 10, radius: 6 })
  .tooltip(["team", "region", "year", "count"]);`;

const withNewUnits = `${base}

const withDelta = base.data([
  ...rows,
  { id: "D1", team: "Delta", region: "North", year: 2027, count: 7 }
]);`;

const bars = `${base}

const byTeam = base
  .group("team")
  .layout("bar", { columns: 3 })
  .color("team");`;

function sample(id, label, description, setup, from, to) {
  return { id, label, description, code: `${setup}\n\nconst from = ${from};\nconst to = ${to};\n\nreturn { from, to };` };
}

export const chart = 'unit';
export async function loadChart() {
  return (await import('../../dist/unit.js')).unit;
}

export const scenarios = [
  sample('value', '01 · Change counts', 'Keep unit identity while counts add or remove repeated marks.', base, 'base', 'base.data(rows.map((row, index) => ({ ...row, count: row.count + (index % 2 ? -2 : 3) })))'),
  sample('add', '02 · Add units', 'Add a new keyed row and grow its units into the grid.', withNewUnits, 'base', 'withDelta'),
  sample('remove', '03 · Remove units', 'Shrink the same added units away without merging them into a summary mark.', withNewUnits, 'withDelta', 'base'),
  sample('filter', '04 · Filter units', 'Remove the South observations and reflow the surviving units.', base, 'base', 'base.where({ region: "North" })'),
  sample('highlight', '05 · Highlight units', 'Keep every unit and dim the category outside the selected region.', base, 'base', 'base.highlight({ region: "North" }, { opacity: 0.12 })'),
  sample('color', '06 · Map color', 'Use color to show team while position stays in one grid.', base, 'base', 'base.color("team")'),
  sample('columns', '07 · Change grid columns', 'Reflow the grid while every matching key keeps its identity.', base, 'base', 'base.layout("grid", { columns: 6, radius: 6 })'),
  sample('radius', '08 · Change unit size', 'Change the size of every equal unit without mapping size to data.', base, 'base', 'base.radius(9)'),
  sample('bar', '09 · Make unit bars', 'Group by team, then position equal units as categorical bars.', bars, 'base', 'byTeam'),
  sample('regroup', '10 · Change the category', 'Set the region view, keep every matching key, then move the units.', bars, 'byTeam', 'base.group("region").layout("bar", { columns: 3 }).color("region")'),
  sample('timeline', '11 · Position on a timeline', 'Stack units at the ordered year positions.', base, 'base', 'base.x("year", { title: "Year", type: "ordinal" }).layout("timeline")'),
  sample('dodge', '12 · Dodge along a position', 'Use collision-free vertical placement around each year position.', base, 'base', 'base.x("year", { title: "Year" }).layout("dodge")'),
  sample('grid', '13 · Return to one grid', 'Move categorical unit bars back into one ungrouped grid.', bars, 'byTeam', 'base')
];
