import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';

import { ProcessSpawnError } from '../../src/errors/ProcessSpawnError.js';
import { TrivyRunner } from '../../src/runner/TrivyRunner.js';
import { TempDirectory } from '../helpers/TempDirectory.js';

/**
 * Stand-in "trivy binary": a Node script that records its argv verbatim to a
 * file and exits with a requested code. Because TrivyRunner spawns with
 * inherited stdio, assertions are made through the filesystem, not stdout.
 */
const RECORDER_SOURCE = `
const fs = require('node:fs');
fs.writeFileSync(process.env.RECORDER_OUTPUT, JSON.stringify(process.argv.slice(2)));
process.exit(Number(process.env.RECORDER_EXIT_CODE ?? '0'));
`;

async function runRecorder(args: readonly string[], exitCode: string): Promise<{ argv: string[]; code: number }> {
  const scratch = await TempDirectory.create();
  const outputPath = scratch.join('argv.json');
  const scriptPath = scratch.join('recorder.cjs');
  await writeFile(scriptPath, RECORDER_SOURCE);
  process.env['RECORDER_OUTPUT'] = outputPath;
  process.env['RECORDER_EXIT_CODE'] = exitCode;
  try {
    // The recorder's process.argv.slice(2) skips the node binary and the
    // script path, leaving exactly what TrivyRunner was asked to forward.
    const code = await new TrivyRunner().run(process.execPath, [scriptPath, ...args]);
    const argv = JSON.parse(await readFile(outputPath, 'utf8')) as string[];
    return { argv, code };
  } finally {
    delete process.env['RECORDER_OUTPUT'];
    delete process.env['RECORDER_EXIT_CODE'];
    await scratch.dispose();
  }
}

test('forwards arguments byte-for-byte, without parsing, reordering or re-quoting', async () => {
  const trickyArgs = [
    'image',
    'python:3.9',
    '--severity',
    'HIGH,CRITICAL',
    '-f',
    'json',
    '--scanners',
    'vuln,secret',
    '--',
    'arg with  spaces',
    '--flag=with=equals',
    '',
    'żółć-unicode-✓',
    '-x',
  ];
  const { argv, code } = await runRecorder(trickyArgs, '0');
  assert.deepEqual(argv, trickyArgs);
  assert.equal(code, 0);
});

test('propagates the child exit code 1:1 (critical for --exit-code CI gates)', async () => {
  const { code } = await runRecorder(['fs', '.'], '13');
  assert.equal(code, 13);
});

test('rejects with ProcessSpawnError when the binary cannot be started', async () => {
  const scratch = await TempDirectory.create();
  try {
    await assert.rejects(
      () => new TrivyRunner().run(scratch.join('does-not-exist'), ['--version']),
      ProcessSpawnError,
    );
  } finally {
    await scratch.dispose();
  }
});
