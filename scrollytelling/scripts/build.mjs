import { cp, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const core = dirname(root);

const coreBuild = spawnSync('npm', ['run', 'build'], {
  cwd: core,
  encoding: 'utf8',
  stdio: 'pipe'
});
if (coreBuild.status !== 0) {
  process.stderr.write(coreBuild.stdout || '');
  process.stderr.write(coreBuild.stderr || '');
  throw new Error('VisDelta core build failed.');
}

await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });

const tsc = spawnSync('npx', ['tsc', '-p', 'tsconfig.json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'pipe'
});
if (tsc.status !== 0) {
  process.stderr.write(tsc.stdout || '');
  process.stderr.write(tsc.stderr || '');
  throw new Error('Scrollytelling TypeScript build failed.');
}

await cp(
  new URL('../src/styles.css', import.meta.url),
  new URL('../dist/scrollytelling.css', import.meta.url)
);
