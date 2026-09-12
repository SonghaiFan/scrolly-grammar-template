// Keep these pairs aligned with tests/browser/transition.spec.mjs.
const population = `const DATA_URL = "./data/us-population-state-age.csv";
const FEATURE_STATES = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA"];

const base = bar(DATA_URL)
  .x("name", { title: "State" })
  .y("<10", { title: "Population", format: "~s" })
  .key("name");

const featured = base.where({ field: "name", oneOf: FEATURE_STATES });`;

const populationDataChange = `const DATA_URL = "./data/us-population-state-age.csv";
const INITIAL_STATES = ["CA", "TX", "FL", "NY", "PA", "IL"];
const EXPANDED_STATES = [...INITIAL_STATES, "OH", "GA"];
const rows = await d3.csv(DATA_URL, d3.autoType);

const base = bar(rows.filter(row => INITIAL_STATES.includes(row.name)))
  .x("name", { title: "State" })
  .y("20-29", { title: "Population", format: "~s" })
  .key("name");`;

const ageConstants = `const DATA_URL = "./data/us-population-state-age.csv";
const AGE_BANDS = ["<10", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "≥80"];
const AGE_COLORS = ["#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd"];
const AGE_LABELS = Object.fromEntries(AGE_BANDS.map(age => [age, age]));`;

const segmentedOverview = `${ageConstants}

const detailed = bar(DATA_URL)
  .x("name", { title: "State" })
  .y("population", { title: "Population", format: "~s" })
  .segment({
    fields: AGE_BANDS,
    as: ["age", "population"],
    category: "name",
    labels: AGE_LABELS,
    domain: AGE_BANDS,
    valueTitle: "Population",
    key: ["name", "age"]
  })
  .color("age", { domain: AGE_BANDS, range: AGE_COLORS });`;

const segmentedFeatured = `${ageConstants}
const FEATURE_STATES = ["CA", "TX", "FL", "NY", "PA", "IL"];

const detailed = bar(DATA_URL)
  .x("name", { title: "State" })
  .y("population", { title: "Population", format: "~s" })
  .where({ field: "name", oneOf: FEATURE_STATES })
  .segment({
    fields: AGE_BANDS,
    as: ["age", "population"],
    category: "name",
    labels: AGE_LABELS,
    domain: AGE_BANDS,
    valueTitle: "Population",
    key: ["name", "age"]
  })
  .color("age", { domain: AGE_BANDS, range: AGE_COLORS });`;

function sample(id, label, description, setup, from, to) {
  return { id, label, description, code: `${setup}\n\nconst from = ${from};\nconst to = ${to};\n\nreturn { from, to };` };
}

export const chart = 'bar';
export async function loadChart() {
  return (await import('../../dist/bar.js')).bar;
}

export const scenarios = [
  sample(
    'measure',
    '01 · Compare age measures',
    'For eight major states, change the bar measure from residents under 10 to residents aged 80 and over.',
    population,
    'featured',
    'featured.y("≥80", { title: "Population aged 80+", format: "~s" })'
  ),
  sample(
    'filter',
    '02 · Filter states',
    'Keep four of the eight explicitly listed states; drag back to restore the others.',
    population,
    'featured',
    'featured.where({ field: "name", oneOf: ["CA", "TX", "FL", "NY"] })'
  ),
  sample(
    'highlight',
    '03 · Highlight states',
    'Emphasize California and Texas while retaining all eight state bars.',
    population,
    'featured',
    'featured.highlight({ field: "name", oneOf: ["CA", "TX"] })'
  ),
  sample(
    'color',
    '04 · Change color measure',
    'Change the quantitative color encoding from the under-10 population to the population aged 80 and over.',
    population,
    'featured.color({ field: "<10", type: "quantitative", title: "Population under 10" })',
    'featured.color({ field: "≥80", type: "quantitative", title: "Population aged 80+" })'
  ),
  sample(
    'sort',
    '05 · Rank all regions',
    'Reorder all 52 regions by their under-10 population, largest first.',
    population,
    'base',
    'base.sort("<10", "descending")'
  ),
  sample(
    'flip',
    '06 · Flip orientation',
    'Move the eight-state comparison from vertical to horizontal bars.',
    population,
    'featured',
    'featured.flip()'
  ),
  sample(
    'data',
    '07 · Add real rows',
    'Replace a six-state extract with an eight-state extract from the same source CSV, without changing any values.',
    populationDataChange,
    'base',
    'base.data(rows.filter(row => EXPANDED_STATES.includes(row.name)))'
  ),
  sample(
    'split',
    '08 · Split into age stacks',
    'Split totals for all 52 regions into nine ordered age bands.',
    segmentedOverview,
    'detailed.rollup()',
    'detailed'
  ),
  sample(
    'merge',
    '09 · Merge age stacks',
    'Combine nine age bands into one population total for every region.',
    segmentedOverview,
    'detailed',
    'detailed.rollup()'
  ),
  sample(
    'layout',
    '10 · Stacked → grouped',
    'For six named states, keep the age detail and change from stacked to side-by-side bars.',
    segmentedFeatured,
    'detailed',
    'detailed.layout("grouped")'
  ),
  sample(
    'grouped-split',
    '11 · Split into grouped ages',
    'Move six state totals into side-by-side age-band detail.',
    segmentedFeatured,
    'detailed.rollup()',
    'detailed.layout("grouped")'
  ),
  sample(
    'grouped-merge',
    '12 · Merge grouped ages',
    'Move the six-state grouped detail back into population totals.',
    segmentedFeatured,
    'detailed.layout("grouped")',
    'detailed.rollup()'
  ),
  sample(
    'focus',
    '13 · Focus the view',
    'Keep all 52 region rows while fitting the category view around eight explicitly listed major states.',
    population,
    'base',
    'base.focus({ field: "name", oneOf: FEATURE_STATES })'
  )
];
