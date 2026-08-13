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
 * It also records the DB repository env vars it received, so the wrapper's
 * default-injection behavior can be asserted.
 */
const RECORDER_SOURCE = `
const fs = require('node:fs');
fs.writeFileSync(process.env.RECORDER_OUTPUT, JSON.stringify({
  argv: process.argv.slice(2),
  dbRepository: process.env.TRIVY_DB_REPOSITORY ?? null,
  javaDbRepository: process.env.TRIVY_JAVA_DB_REPOSITORY ?? null,
}));
process.exit(Number(process.env.RECORDER_EXIT_CODE ?? '0'));
`;

interface RecorderResult {
  argv: string[];
  code: number;
  dbRepository: string | null;
  javaDbRepository: string | null;
}

async function runRecorder(args: readonly string[], exitCode: string): Promise<RecorderResult> {
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
    const parsed = JSON.parse(await readFile(outputPath, 'utf8')) as {
      argv: string[];
      dbRepository: string | null;
      javaDbRepository: string | null;
    };
    return { argv: parsed.argv, code, dbRepository: parsed.dbRepository, javaDbRepository: parsed.javaDbRepository };
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

test('injects GHCR-first DB repository defaults when the caller did not set them', async () => {
  // mirror.gcr.io returns 404 for the Trivy DB artifact in many environments
  // and Trivy does not fall back on 404 (only 429/5xx), so the wrapper must
  // steer the child away from mirror.gcr.io by default.
  delete process.env['TRIVY_DB_REPOSITORY'];
  delete process.env['TRIVY_JAVA_DB_REPOSITORY'];
  try {
    const { dbRepository, javaDbRepository } = await runRecorder(['image', 'alpine'], '0');
    assert.equal(dbRepository, TrivyRunner.DEFAULT_DB_REPOSITORY);
    assert.equal(javaDbRepository, TrivyRunner.DEFAULT_JAVA_DB_REPOSITORY);
    // Sanity: the defaults must NOT reference mirror.gcr.io.
    assert.match(dbRepository ?? '', /^ghcr\.io/);
    assert.match(javaDbRepository ?? '', /^ghcr\.io/);
  } finally {
    delete process.env['TRIVY_DB_REPOSITORY'];
    delete process.env['TRIVY_JAVA_DB_REPOSITORY'];
  }
});

test('respects caller-provided TRIVY_DB_REPOSITORY and does not override it', async () => {
  const custom = 'registry.example.com/internal/trivy-db:2';
  process.env['TRIVY_DB_REPOSITORY'] = custom;
  try {
    const { dbRepository } = await runRecorder(['image', 'alpine'], '0');
    assert.equal(dbRepository, custom);
  } finally {
    delete process.env['TRIVY_DB_REPOSITORY'];
  }
});

test('respects caller-provided TRIVY_JAVA_DB_REPOSITORY and does not override it', async () => {
  const custom = 'registry.example.com/internal/trivy-java-db:1';
  process.env['TRIVY_JAVA_DB_REPOSITORY'] = custom;
  try {
    const { javaDbRepository } = await runRecorder(['image', 'alpine'], '0');
    assert.equal(javaDbRepository, custom);
  } finally {
    delete process.env['TRIVY_JAVA_DB_REPOSITORY'];
  }
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
