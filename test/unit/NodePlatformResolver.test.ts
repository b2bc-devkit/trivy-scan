import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ArchiveFormat } from '../../src/domain/ArchiveFormat.js';
import { TrivyVersion } from '../../src/domain/TrivyVersion.js';
import { UnsupportedPlatformError } from '../../src/errors/UnsupportedPlatformError.js';
import { NodePlatformResolver } from '../../src/platform/NodePlatformResolver.js';

const VERSION = TrivyVersion.of('0.72.0');

test('maps every supported platform to the documented artifact name', () => {
  const expectations: ReadonlyArray<[NodeJS.Platform, string, string]> = [
    ['linux', 'x64', 'trivy_0.72.0_Linux-64bit.tar.gz'],
    ['linux', 'arm64', 'trivy_0.72.0_Linux-ARM64.tar.gz'],
    ['linux', 'arm', 'trivy_0.72.0_Linux-ARM.tar.gz'],
    ['linux', 'ppc64', 'trivy_0.72.0_Linux-PPC64LE.tar.gz'],
    ['linux', 's390x', 'trivy_0.72.0_Linux-s390x.tar.gz'],
    ['darwin', 'x64', 'trivy_0.72.0_macOS-64bit.tar.gz'],
    ['darwin', 'arm64', 'trivy_0.72.0_macOS-ARM64.tar.gz'],
    ['win32', 'x64', 'trivy_0.72.0_windows-64bit.zip'],
    ['win32', 'arm64', 'trivy_0.72.0_windows-64bit.zip'],
  ];
  for (const [platform, arch, assetName] of expectations) {
    const target = new NodePlatformResolver(platform, arch).resolve();
    assert.equal(target.assetNameFor(VERSION), assetName, `${platform}-${arch}`);
  }
});

test('windows targets use zip + trivy.exe; unix targets use tar.gz + trivy', () => {
  const windows = new NodePlatformResolver('win32', 'x64').resolve();
  assert.equal(windows.archiveFormat(), ArchiveFormat.ZIP);
  assert.equal(windows.executableName(), 'trivy.exe');
  assert.ok(windows.isWindows());

  const linux = new NodePlatformResolver('linux', 'x64').resolve();
  assert.equal(linux.archiveFormat(), ArchiveFormat.TAR_GZ);
  assert.equal(linux.executableName(), 'trivy');
  assert.ok(!linux.isWindows());
});

test('unsupported combinations raise UnsupportedPlatformError listing all supported keys', () => {
  assert.throws(
    () => new NodePlatformResolver('freebsd', 'x64').resolve(),
    (error: unknown) => {
      assert.ok(error instanceof UnsupportedPlatformError);
      assert.equal(error.unsupportedPlatformKey(), 'freebsd-x64');
      for (const key of NodePlatformResolver.supportedPlatformKeys()) {
        assert.ok(error.message.includes(key), `message should list ${key}`);
      }
      return true;
    },
  );
});

test('supportedTargets() round-trips the platform matrix', () => {
  const targets = NodePlatformResolver.supportedTargets();
  assert.equal(targets.length, NodePlatformResolver.supportedPlatformKeys().length);
  for (const target of targets) {
    const [platform, arch] = [target.platformKey().split('-')[0], target.platformKey().split('-').slice(1).join('-')];
    const resolved = new NodePlatformResolver(platform as NodeJS.Platform, arch as string).resolve();
    assert.equal(resolved.assetNameFor(VERSION), target.assetNameFor(VERSION));
  }
});
