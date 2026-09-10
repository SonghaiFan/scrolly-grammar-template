import { readFile, stat } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pointScenarios } from '../examples/point/scenarios.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const exampleDir = join(root, 'examples', 'transition');
const html = await readFile(join(exampleDir, 'index.html'), 'utf8');

await assertLocalAssets(html, exampleDir);
assertPublicImports(html);
assertPointScenarios(pointScenarios);

console.log('Bar and point example invariants ok.');

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

function assertPointScenarios(scenarios) {
  if (scenarios.length !== 12) {
    throw new Error(`Point Lab must expose 12 scenarios; found ${scenarios.length}.`);
  }
  const ids = new Set(scenarios.map(scenario => scenario.id));
  if (ids.size !== scenarios.length) throw new Error('Point Lab scenario ids must be unique.');
  for (const scenario of scenarios) {
    if (!scenario.label || !scenario.description || !scenario.code.includes('return { from, to };')) {
      throw new Error(`Point Lab scenario is incomplete: ${scenario.id || '(missing id)'}`);
    }
  }
}
