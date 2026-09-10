// Generated from src/charts/*/plugin.ts.
// Run scripts/sync-chart-manifest.mjs after adding or removing a chart-type folder.
import { chartModule as bar } from "./bar/module.js";
import { chartModule as line } from "./line/module.js";
import { chartModule as point } from "./point/module.js";
import { chartModule as unit } from "./unit/module.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const builtInChartModules = [
    bar,
    line,
    point,
    unit
];
