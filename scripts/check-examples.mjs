import { readFile, stat } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const exampleDir = join(root, 'examples', 'transition');
const html = await readFile(join(exampleDir, 'index.html'), 'utf8');

await assertLocalAssets(html, exampleDir);
assertPublicImports(html);

console.log('Focused transition example invariants ok.');

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
