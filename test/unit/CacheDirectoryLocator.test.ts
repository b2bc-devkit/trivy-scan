import assert from 'node:assert/strict';
import { join, resolve, sep } from 'node:path';
import { test } from 'node:test';

import { CacheDirectoryLocator } from '../../src/cache/CacheDirectoryLocator.js';
import { TrivyVersion } from '../../src/domain/TrivyVersion.js';
import { NodePlatformResolver } from '../../src/platform/NodePlatformResolver.js';
import { FakeConfiguration } from '../helpers/FakeConfiguration.js';
import { VersionSpec } from '../../src/config/VersionSpec.js';

const HOME = join(sep, 'home', 'tester');
const VERSION = TrivyVersion.of('0.72.0');

test('TRIVY_SCAN_CACHE_DIR override wins on every platform', () => {
  const configuration = new FakeConfiguration(VersionSpec.LATEST, './custom-cache');
  const locator = new CacheDirectoryLocator(configuration, {}, 'linux', HOME);
  assert.equal(locator.rootDirectory(), resolve('./custom-cache'));
});

test('macOS uses ~/Library/Caches', () => {
  const locator = new CacheDirectoryLocator(new FakeConfiguration(), {}, 'darwin', HOME);
  assert.equal(locator.rootDirectory(), join(HOME, 'Library', 'Caches', 'trivy-scan'));
});

test('Windows prefers LOCALAPPDATA and falls back to the home profile', () => {
  const withVariable = new CacheDirectoryLocator(
    new FakeConfiguration(),
    { LOCALAPPDATA: join('C:', 'Users', 'tester', 'AppData', 'Local') },
    'win32',
    HOME,
  );
  assert.equal(
    withVariable.rootDirectory(),
    join('C:', 'Users', 'tester', 'AppData', 'Local', 'trivy-scan', 'Cache'),
  );

  const withoutVariable = new CacheDirectoryLocator(new FakeConfiguration(), {}, 'win32', HOME);
  assert.equal(withoutVariable.rootDirectory(), join(HOME, 'AppData', 'Local', 'trivy-scan', 'Cache'));
});

test('Linux honors XDG_CACHE_HOME and falls back to ~/.cache', () => {
  const withXdg = new CacheDirectoryLocator(new FakeConfiguration(), { XDG_CACHE_HOME: join(sep, 'xdg') }, 'linux', HOME);
  assert.equal(withXdg.rootDirectory(), join(sep, 'xdg', 'trivy-scan'));

  const withoutXdg = new CacheDirectoryLocator(new FakeConfiguration(), {}, 'linux', HOME);
  assert.equal(withoutXdg.rootDirectory(), join(HOME, '.cache', 'trivy-scan'));
});

test('derived paths live under the versioned directory', () => {
  const locator = new CacheDirectoryLocator(new FakeConfiguration(), {}, 'linux', HOME);
  const root = locator.rootDirectory();
  const target = new NodePlatformResolver('linux', 'x64').resolve();
  assert.equal(locator.versionDirectory(VERSION), join(root, 'v0.72.0'));
  assert.equal(locator.binaryPath(VERSION, target), join(root, 'v0.72.0', 'trivy'));
  assert.equal(locator.checksumManifestPath(VERSION), join(root, 'v0.72.0', 'checksums.txt'));
  assert.equal(locator.versionCheckFilePath(), join(root, 'latest-version.json'));
});
