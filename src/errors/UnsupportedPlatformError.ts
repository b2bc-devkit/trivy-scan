import { TrivyScanError } from './TrivyScanError.js';

/** Raised when no official Trivy artifact exists for the host OS/CPU combination. */
export class UnsupportedPlatformError extends TrivyScanError {
  private readonly platformKey: string;

  public constructor(platformKey: string, supportedKeys: readonly string[]) {
    super(
      [
        `unsupported platform "${platformKey}" — no official Trivy binary is published for it.`,
        `Supported platforms: ${supportedKeys.join(', ')}.`,
      ].join('\n'),
    );
    this.platformKey = platformKey;
  }

  /** The unsupported `<process.platform>-<process.arch>` pair, e.g. "freebsd-x64". */
  public unsupportedPlatformKey(): string {
    return this.platformKey;
  }
}
