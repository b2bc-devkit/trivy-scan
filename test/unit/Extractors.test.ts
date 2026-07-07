import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { create as createTar } from 'tar';

import { TarGzArchiveExtractor } from '../../src/archive/TarGzArchiveExtractor.js';
import { ZipArchiveExtractor } from '../../src/archive/ZipArchiveExtractor.js';
import { ExtractionError } from '../../src/errors/ExtractionError.js';
import { TempDirectory } from '../helpers/TempDirectory.js';

// Tiny zip built with Python's zipfile (deflate), containing LICENSE + trivy.exe.
const ZIP_FIXTURE_BASE64 =
  'UEsDBBQAAAAIAA5i51xGwaTPFgAAABQAAAAHAAAATElDRU5TRfP1DFFIy6woKS1KVcjJTE7NK07lAgBQSwMEFAAAAAgADmLnXOnlmaouAAAALAAAAAkAAAB0cml2eS5leGXzjdJNS8xO1S0pyiyr1E3KzEssqtRNzs8rSc0r0U3LL9Itzcss0S1JLS4p5gIAUEsBAhQDFAAAAAgADmLnXEbBpM8WAAAAFAAAAAcAAAAAAAAAAAAAAIABAAAAAExJQ0VOU0VQSwECFAMUAAAACAAOYudc6eWZqi4AAAAsAAAACQAAAAAAAAAAAAAAgAE7AAAAdHJpdnkuZXhlUEsFBgAAAAACAAIAbAAAAJAAAAAAAA==';

async function createTarGzFixture(scratch: TempDirectory): Promise<string> {
  const contentDirectory = scratch.join('content');
  await mkdir(contentDirectory, { recursive: true });
  await writeFile(`${contentDirectory}/trivy`, '#!/bin/sh\necho fake-trivy\n', { mode: 0o755 });
  await writeFile(`${contentDirectory}/README.md`, 'not the binary\n');
  const archivePath = scratch.join('trivy_test.tar.gz');
  await createTar({ gzip: true, file: archivePath, cwd: contentDirectory }, ['trivy', 'README.md']);
  return archivePath;
}

test('TarGzArchiveExtractor extracts exactly the requested entry', async () => {
  const scratch = await TempDirectory.create();
  try {
    const archivePath = await createTarGzFixture(scratch);
    const destinationPath = scratch.join('out', 'trivy');
    await mkdir(scratch.join('out'), { recursive: true });
    await new TarGzArchiveExtractor().extract(archivePath, 'trivy', destinationPath);
    assert.equal(await readFile(destinationPath, 'utf8'), '#!/bin/sh\necho fake-trivy\n');
  } finally {
    await scratch.dispose();
  }
});

test('TarGzArchiveExtractor fails cleanly when the entry is missing', async () => {
  const scratch = await TempDirectory.create();
  try {
    const archivePath = await createTarGzFixture(scratch);
    await assert.rejects(
      () => new TarGzArchiveExtractor().extract(archivePath, 'not-there', scratch.join('out-missing')),
      ExtractionError,
    );
  } finally {
    await scratch.dispose();
  }
});

test('ZipArchiveExtractor extracts exactly the requested entry', async () => {
  const scratch = await TempDirectory.create();
  try {
    const archivePath = scratch.join('trivy_test.zip');
    await writeFile(archivePath, Buffer.from(ZIP_FIXTURE_BASE64, 'base64'));
    const destinationPath = scratch.join('trivy.exe');
    await new ZipArchiveExtractor().extract(archivePath, 'trivy.exe', destinationPath);
    assert.equal(await readFile(destinationPath, 'utf8'), 'MZ-fake-trivy-binary-content-for-unit-tests\n');
  } finally {
    await scratch.dispose();
  }
});

test('ZipArchiveExtractor fails cleanly when the entry is missing', async () => {
  const scratch = await TempDirectory.create();
  try {
    const archivePath = scratch.join('trivy_test.zip');
    await writeFile(archivePath, Buffer.from(ZIP_FIXTURE_BASE64, 'base64'));
    await assert.rejects(
      () => new ZipArchiveExtractor().extract(archivePath, 'not-there.exe', scratch.join('out-missing')),
      ExtractionError,
    );
  } finally {
    await scratch.dispose();
  }
});

test('ZipArchiveExtractor rejects corrupted archives', async () => {
  const scratch = await TempDirectory.create();
  try {
    const archivePath = scratch.join('corrupt.zip');
    await writeFile(archivePath, 'this is not a zip file at all');
    await assert.rejects(
      () => new ZipArchiveExtractor().extract(archivePath, 'trivy.exe', scratch.join('out')),
      ExtractionError,
    );
  } finally {
    await scratch.dispose();
  }
});
