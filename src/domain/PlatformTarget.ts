import { ArchiveFormat } from './ArchiveFormat.js';
import type { TrivyVersion } from './TrivyVersion.js';

/**
 * Immutable value object describing one supported host platform and the
 * official Trivy release artifact that serves it.
 *
 * Encapsulates Trivy's artifact naming conventions, e.g.:
 *   linux/x64    -> trivy_0.72.0_Linux-64bit.tar.gz
 *   darwin/arm64 -> trivy_0.72.0_macOS-ARM64.tar.gz
 *   win32/x64    -> trivy_0.72.0_windows-64bit.zip
 */
export class PlatformTarget {
  private readonly nodePlatform: NodeJS.Platform;
  private readonly nodeArch: string;
  private readonly assetSuffix: string;

  public constructor(nodePlatform: NodeJS.Platform, nodeArch: string, assetSuffix: string) {
    this.nodePlatform = nodePlatform;
    this.nodeArch = nodeArch;
    this.assetSuffix = assetSuffix;
  }

  /** Canonical `<process.platform>-<process.arch>` key, e.g. "darwin-arm64". */
  public platformKey(): string {
    return `${this.nodePlatform}-${this.nodeArch}`;
  }

  /** Trailing part of the artifact name, e.g. "Linux-64bit.tar.gz". */
  public suffix(): string {
    return this.assetSuffix;
  }

  /** Full artifact file name for a release, e.g. "trivy_0.72.0_Linux-64bit.tar.gz". */
  public assetNameFor(version: TrivyVersion): string {
    return `trivy_${version.semver()}_${this.assetSuffix}`;
  }

  public archiveFormat(): ArchiveFormat {
    return this.assetSuffix.endsWith('.zip') ? ArchiveFormat.ZIP : ArchiveFormat.TAR_GZ;
  }

  /** File name of the Trivy executable inside the artifact ("trivy" / "trivy.exe"). */
  public executableName(): string {
    return this.isWindows() ? 'trivy.exe' : 'trivy';
  }

  public isWindows(): boolean {
    return this.nodePlatform === 'win32';
  }
}
