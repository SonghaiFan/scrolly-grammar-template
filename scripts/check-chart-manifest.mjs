import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chartsDir = join(root, "src", "charts");
const builtinsPath = join(chartsDir, "builtins.ts");

const entries = await readdir(chartsDir);
const chartTypes = [];

for (const entry of entries) {
  const fullPath = join(chartsDir, entry);
  if (!(await stat(fullPath)).isDirectory()) continue;
  const hasPlugin = await stat(join(fullPath, "plugin.ts")).then(() => true).catch(() => false)
    || await stat(join(fullPath, "plugin.js")).then(() => true).catch(() => false);
  if (!hasPlugin) continue;
  const hasModule = await stat(join(fullPath, "module.ts")).then(() => true).catch(() => false)
    || await stat(join(fullPath, "module.js")).then(() => true).catch(() => false);
  if (!hasModule) throw new Error(`Chart folder "${entry}" has plugin.ts but no module.ts.`);
  chartTypes.push(entry);
}

chartTypes.sort();

const expectedBuiltins = builtinsSource(chartTypes);
const actualBuiltins = await readFile(builtinsPath, "utf8");

if (actualBuiltins !== expectedBuiltins) {
  throw new Error("The built-in chart inventory is stale. Run node scripts/sync-chart-manifest.mjs.");
}

console.log(`Built-in inventory covers ${chartTypes.length} chart types.`);

const registrySource = await readFile(join(root, 'src/runtime/chart-registry.ts'), 'utf8');
if (/from\s+['"][^'"]*\/charts\/[^'"]+\//.test(registrySource)) {
  throw new Error('The chart registry must not import a concrete chart type.');
}

function identifier(name) {
  return name.replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^[^a-zA-Z_$]/, "_$&");
}

function builtinsSource(names) {
  const importLines = names.map((name) => `import { chartModule as ${identifier(name)} } from "./${name}/module.js";`);
  const moduleLines = names.map((name) => `  ${identifier(name)}`);
  return `${[
    "import type { ChartModule } from './module.js';",
    "// Generated from chart folders containing plugin.ts and module.ts.",
    "// Run scripts/sync-chart-manifest.mjs after adding or removing a chart-type folder.",
    ...importLines,
    "",
    "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
    "export const builtInChartModules: ChartModule<any>[] = [",
    `${moduleLines.join(",\n")}`,
    "];",
    ""
  ].join("\n")}`;
}
