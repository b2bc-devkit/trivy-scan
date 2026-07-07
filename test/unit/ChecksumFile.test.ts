import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ChecksumFile } from '../../src/security/ChecksumFile.js';

const SAMPLE = [
  'bbb64b9695866ce4a7a8f5c9592002c5961cab378577fa3f8a040df362b9b2ea  trivy_0.72.0_Linux-64bit.tar.gz',
  'ED3CF122060F61818FE1F735FD97557954E16E10BC8B058AF9852271CF2E91B3  trivy_0.72.0_windows-64bit.zip',
  '88f208680dc05da2b459e19b4f5aa2b4dc7c2117892ba4aab2ae63baba330016 *trivy_0.72.0_macOS-ARM64.tar.gz',
  '',
  'this line is garbage and must be ignored',
  'deadbeef  too-short-hash.tar.gz',
].join('\n');

test('parses sha256sum-style manifests, tolerating case, binary markers and junk lines', () => {
  const file = ChecksumFile.parse(SAMPLE);
  assert.equal(file.size(), 3);
  assert.equal(
    file.digestFor('trivy_0.72.0_Linux-64bit.tar.gz')?.toString(),
    'bbb64b9695866ce4a7a8f5c9592002c5961cab378577fa3f8a040df362b9b2ea',
  );
  // Uppercase hex is normalized to lowercase.
  assert.equal(
    file.digestFor('trivy_0.72.0_windows-64bit.zip')?.toString(),
    'ed3cf122060f61818fe1f735fd97557954e16e10bc8b058af9852271cf2e91b3',
  );
  // `sha256sum -b` marks binary mode with an asterisk before the name.
  assert.equal(
    file.digestFor('trivy_0.72.0_macOS-ARM64.tar.gz')?.toString(),
    '88f208680dc05da2b459e19b4f5aa2b4dc7c2117892ba4aab2ae63baba330016',
  );
});

test('returns null for unknown artifacts', () => {
  assert.equal(ChecksumFile.parse(SAMPLE).digestFor('nope.tar.gz'), null);
});
