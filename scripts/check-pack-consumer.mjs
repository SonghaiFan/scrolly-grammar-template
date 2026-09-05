import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const expectedApi = [
  "Seq",
  "availableChartIdioms",
  "bar",
  "chart",
  "createChart",
  "createPage",
  "createStory",
  "defineChartIdiom",
  "delta",
  "diffViewStates",
  "line",
  "page",
  "point",
  "registerChartIdiom",
  "registerChartModule",
  "render",
  "seq",
  "story",
  "transition",
  "unit",
  "visualizationSpec"
];

let tarball = null;
let consumerDir = null;

try {
  const pack = run("npm", ["pack", "--json", "--ignore-scripts"], root);
  const [packed] = JSON.parse(pack.stdout);
  console.log(`Tarball: ${packed.size} bytes; unpacked: ${packed.unpackedSize} bytes.`);
  tarball = join(root, packed.filename);
  consumerDir = await mkdtemp(join(tmpdir(), "scrollylite-consumer-"));

  await writeFile(
    join(consumerDir, "package.json"),
    JSON.stringify({ type: "module", private: true }, null, 2)
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--legacy-peer-deps",
    "--no-audit",
    "--no-fund",
    tarball
  ], consumerDir);

  await writeConsumerSmoke(consumerDir);
  run("node", ["consumer-smoke.mjs"], consumerDir);
  await writeFile(join(consumerDir, "consumer.ts"), await readFile(join(root, "tests/types/consumer.ts")));
  run(process.execPath, [join(root, "node_modules/typescript/bin/tsc"),
    "--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext",
    "--lib", "ES2022,DOM", "consumer.ts"], consumerDir);
  // Also test ordinary npm resolution: D3 is a required peer, while Arquero
  // must remain absent unless the consumer explicitly requests transforms.
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], consumerDir);
  run(process.execPath, ["--input-type=module", "--eval", `
    import * as d3 from 'd3';
    import { bar, delta } from 'scrollylite';
    if (typeof d3.scaleLinear !== 'function') throw new Error('Normal install did not resolve D3.');
    let optionalInstalled = false;
    try { import.meta.resolve('arquero'); optionalInstalled = true; }
    catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
    if (optionalInstalled) throw new Error('Arquero was unexpectedly required by a no-transform consumer.');
    const a = bar([{ key: 'A', value: 1, next: 2 }]).x('key').y('value');
    if (!delta(a, a.y('next')).hasDelta('encoding.y')) throw new Error('Normal installed authoring failed.');
  `], consumerDir);
  console.log("Pack consumer invariants ok.");
} finally {
  if (tarball) await rm(tarball, { force: true });
  if (consumerDir) await rm(consumerDir, { recursive: true, force: true });
}

async function writeConsumerSmoke(dir) {
const source = `
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as api from "scrollylite";
import * as browserApi from "scrollylite/browser";
import { bar as focusedBar } from "scrollylite/bar";
import { delta as focusedDelta } from "scrollylite/core";
import { transition as focusedTransition } from "scrollylite/transition";
import { seq as focusedSeq } from "scrollylite/story";
import { defineChartIdiom as focusedPlugin } from "scrollylite/plugins";

const expectedApi = ${JSON.stringify(expectedApi, null, 2)};
const actualApi = Object.keys(api).sort();
assertSame(actualApi, expectedApi, "public API");
assertSame(Object.keys(browserApi).sort(), expectedApi, "browser public API");
assertSame(Object.keys(globalThis.ScrollyLite).sort(), expectedApi, "browser global API");
assertSame(api.availableChartIdioms(), ["bar", "line", "point", "unit"], "chart idioms");
if (typeof focusedBar !== "function") throw new Error("bar subpath did not export bar()");
if (typeof focusedDelta !== "function") throw new Error("core subpath did not export delta()");
if (typeof focusedTransition !== "function") throw new Error("transition subpath did not export transition()");
if (typeof focusedSeq !== "function") throw new Error("story subpath did not export seq()");
if (typeof focusedPlugin !== "function") throw new Error("plugins subpath did not export defineChartIdiom()");

const spec = api.story()
  .data("rows", { url: "./rows.csv", type: "csv" })
  .view("main", { height: 420 })
  .add("Baseline", api.bar("rows").x("category").y("value"))
  .toSpec();
if (!spec.steps?.length) throw new Error("story builder did not emit steps");

await assertRejects(
  () => api.createStory({ steps: [{ views: { main: { mark: "bar" } } }] }),
  "Pass { d3 } to createStory()",
  "createStory dependency contract"
);

const entry = fileURLToPath(import.meta.resolve("scrollylite"));
const browserEntry = fileURLToPath(import.meta.resolve("scrollylite/browser"));
const style = fileURLToPath(import.meta.resolve("scrollylite/style.css"));
const theme = fileURLToPath(import.meta.resolve("scrollylite/themes/default.css"));
const root = entry.replace(/\\/dist\\/scrollylite\\.esm\\.js$/, "");
const globalScript = root + "/dist/scrollylite.global.js";
assertSame(browserEntry, root + "/dist/scrollylite.browser.js", "browser export");
await assertFile(root + "/dist/index.d.ts", "types");
await assertFile(root + "/dist/browser.d.ts", "browser types");
await assertFile(globalScript, "global script");
assertSame(style, root + "/dist/scrollylite.css", "style export");
assertSame(theme, root + "/dist/themes/default.css", "theme export");
await assertFile(style, "style");
await assertFile(theme, "theme");
await assertGlobalScript(globalScript);

function assertSame(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(\`\${label} mismatch: expected \${right}, got \${left}\`);
  }
}

async function assertRejects(fn, message, label) {
  try {
    await fn();
  } catch (error) {
    if (String(error?.message || error).includes(message)) return;
    throw new Error(\`\${label} rejected with wrong error: \${error?.message || error}\`);
  }
  throw new Error(\`\${label} did not reject\`);
}

async function assertFile(path, label) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) throw new Error(\`missing \${label}: \${path}\`);
}

async function assertGlobalScript(path) {
  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(await readFile(path, "utf8"), context);
  assertSame(Object.keys(context.ScrollyLite).sort(), expectedApi, "global script API");
}
`;
  await writeFile(join(dir, "consumer-smoke.mjs"), source);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, npm_config_cache: join(tmpdir(), "scrollylite-npm-cache") },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status === 0) return result;

  const rendered = [result.stdout, result.stderr].filter(Boolean).join("\n");
  throw new Error(`${command} ${args.join(" ")} failed:\n${rendered}`);
}
