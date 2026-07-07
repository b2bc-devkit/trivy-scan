import type { PlatformResolver } from './PlatformResolver.js';
import { PlatformTarget } from '../domain/PlatformTarget.js';
import { UnsupportedPlatformError } from '../errors/UnsupportedPlatformError.js';

/**
 * Maps Node's `process.platform` / `process.arch` onto Trivy's artifact
 * naming conventions:
 *
 *   OS:   darwin -> macOS, linux -> Linux, win32 -> windows
 *   Arch: x64 -> 64bit, arm64 -> ARM64 (plus arm, ppc64 and s390x on Linux)
 */
export class NodePlatformResolver implements PlatformResolver {
  /** `<process.platform>-<process.arch>` -> artifact name suffix. */
  private static readonly ASSET_SUFFIXES: ReadonlyMap<string, string> = new Map([
    ['linux-x64', 'Linux-64bit.tar.gz'],
    ['linux-arm64', 'Linux-ARM64.tar.gz'],
    ['linux-arm', 'Linux-ARM.tar.gz'],
    ['linux-ppc64', 'Linux-PPC64LE.tar.gz'],
    ['linux-s390x', 'Linux-s390x.tar.gz'],
    ['darwin-x64', 'macOS-64bit.tar.gz'],
    ['darwin-arm64', 'macOS-ARM64.tar.gz'],
    ['win32-x64', 'windows-64bit.zip'],
    // No native windows/arm64 artifact is published; Windows on ARM runs the
    // x64 build transparently through its built-in emulation layer.
    ['win32-arm64', 'windows-64bit.zip'],
  ]);

  private readonly nodePlatform: NodeJS.Platform;
  private readonly nodeArch: string;

  public constructor(nodePlatform: NodeJS.Platform = process.platform, nodeArch: string = process.arch) {
    this.nodePlatform = nodePlatform;
    this.nodeArch = nodeArch;
  }

  public resolve(): PlatformTarget {
    const key = `${this.nodePlatform}-${this.nodeArch}`;
    const suffix = NodePlatformResolver.ASSET_SUFFIXES.get(key);
    if (suffix === undefined) {
      throw new UnsupportedPlatformError(key, NodePlatformResolver.supportedPlatformKeys());
    }
    return new PlatformTarget(this.nodePlatform, this.nodeArch, suffix);
  }

  public static supportedPlatformKeys(): readonly string[] {
    return [...NodePlatformResolver.ASSET_SUFFIXES.keys()];
  }

  /** Distinct artifact suffixes across all supported platforms. */
  public static supportedAssetSuffixes(): readonly string[] {
    return [...new Set(NodePlatformResolver.ASSET_SUFFIXES.values())];
  }

  /** One {@link PlatformTarget} per supported platform key. */
  public static supportedTargets(): readonly PlatformTarget[] {
    return [...NodePlatformResolver.ASSET_SUFFIXES.entries()].map(([key, suffix]) => {
      const separator = key.indexOf('-');
      const platform = key.slice(0, separator) as NodeJS.Platform;
      const arch = key.slice(separator + 1);
      return new PlatformTarget(platform, arch, suffix);
    });
  }
}
