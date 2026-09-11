import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const examplesDir = join(root, 'examples');
const exampleDir = join(root, 'examples', 'transition');
const html = await readFile(join(exampleDir, 'index.html'), 'utf8');

await assertLocalAssets(html, exampleDir);
assertPublicImports(html);
const labs = await discoverLabs(examplesDir);
assertLab(labs.get('bar'), 'bar', 13);
assertLab(labs.get('point'), 'point', 13);
assertLab(labs.get('line'), 'line', 16);
assertLab(labs.get('area'), 'area', 14);

console.log('Bar, point, line, and area example invariants ok.');

async function discoverLabs(directory) {
  const labs = new Map();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const source = join(directory, entry.name, 'scenarios.js');
    const info = await stat(source).catch(() => null);
    if (!info?.isFile()) continue;
    const module = await import(pathToFileURL(source).href);
    if (!module.chart || !Array.isArray(module.scenarios) || typeof module.loadChart !== 'function') {
      throw new Error(`${entry.name}/scenarios.js must export chart, scenarios, and loadChart().`);
    }
    if (labs.has(module.chart)) throw new Error(`Duplicate Lab chart key: ${module.chart}`);
    labs.set(module.chart, module);
  }
  return labs;
}

async function assertLocalAssets(source, baseDir) {
  const attrs = [...source.matchAll(/\s(?:href|src)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(value => value && !/^(?:https?:|\?|#)/.test(value))
    // Compatibility launchers may point at generated documentation, which is
    // intentionally absent in a clean checkout until `docs:check` runs.
    .filter(value => !value.includes('docs/.vitepress/dist/'));
  const moduleImports = [...source.matchAll(/\bfrom\s+"([^"]+)"/g)]
    .map(match => match[1])
    .filter(value => value.startsWith('.'));

  for (const value of [...attrs, ...moduleImports]) {
    const path = normalize(join(baseDir, value.split('#')[0].split('?')[0]));
    const info = await stat(path).catch(() => null);
    if (!info?.isFile()) throw new Error(`Example asset does not exist: ${value}`);
  }
}

function assertPublicImports(source) {
  const imports = [...source.matchAll(/\bfrom\s+"([^"]+)"/g)].map(match => match[1]);
  const privateImport = imports.find(value => value.includes('/src/'));
  if (privateImport) throw new Error(`Example imports private source: ${privateImport}`);
}

function assertLab(module, chart, expectedCount) {
  if (!module) throw new Error(`${chart} Lab scenario module is missing.`);
  const scenarios = module.scenarios;
  if (scenarios.length !== expectedCount) {
    throw new Error(`${chart} Lab must expose ${expectedCount} scenarios; found ${scenarios.length}.`);
  }
  const ids = new Set(scenarios.map(scenario => scenario.id));
  if (ids.size !== scenarios.length) throw new Error(`${chart} Lab scenario ids must be unique.`);
  for (const scenario of scenarios) {
    if (!scenario.label || !scenario.description || !scenario.code.includes('return { from, to };')) {
      throw new Error(`${chart} Lab scenario is incomplete: ${scenario.id || '(missing id)'}`);
    }
  }
}
