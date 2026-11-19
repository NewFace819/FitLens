// Compile the actual domain modules, then run Node tests without React Native mocks.
const { mkdtempSync, rmSync, readdirSync, cpSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve, dirname, basename } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');
const output = mkdtempSync(join(tmpdir(), 'fitlens-training-'));
const build = join(output, 'mobile/src');
try {
  cpSync(join(root, '../prototype'), join(output, 'prototype'), { recursive: true, filter: source => !source.includes('assets') && !source.endsWith('desktop.ini') });
  const compiler =
    process.env.TYPESCRIPT_TSC || require.resolve('typescript/lib/tsc.js');
  const modules = [
    'src/shared/storage.ts',
    'src/modules/history/history.ts',
    'src/modules/checkin/checkin.ts',
    'src/modules/rhythm/rhythm.ts',
    ...readdirSync(join(root, 'src/modules/training'))
      .filter(f => f.endsWith('.ts'))
      .map(f => 'src/modules/training/' + f),
  ];
  const compile = spawnSync(
    process.execPath,
    [
      compiler,
      '--strict',
      '--skipLibCheck',
      '--noEmitOnError',
      '--target',
      'ES2022',
      '--module',
      'node16',
      '--typeRoots',
      join(root, 'node_modules/@types'),
      '--types',
      'node',
      '--rootDir',
      join(root, 'src'),
      '--outDir',
      build,
      ...modules.map(file => join(root, file)),
    ],
    { cwd: output, stdio: 'inherit' },
  );
  if (compile.status !== 0) process.exitCode = 1;
  else {
    const tests = readdirSync(join(root, 'tests'))
      .filter(f => f.endsWith('.test.cjs'))
      .map(f => 'tests/' + f);
    const result = spawnSync(process.execPath, ['--test', ...tests], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, FITLENS_TEST_BUILD: build },
    });
    process.exitCode = result.status ?? 1;
  }
} finally {
  if (
    dirname(resolve(output)) !== resolve(tmpdir()) ||
    !basename(output).startsWith('fitlens-training-')
  ) {
    throw new Error('Unexpected temporary build directory');
  }
  rmSync(output, { recursive: true, force: true });
}
