import type { TrivyVersion } from '../domain/TrivyVersion.js';

/**
 * Immutable value object describing which Trivy version the user asked for.
 *
 * Three strategies exist (see {@link EnvironmentConfiguration}):
 *  - LATEST:   resolve the newest release from GitHub (cached, with fallback)
 *  - PINNED:   use the release baked into this package — fully offline-safe
 *  - EXPLICIT: use an exact version, e.g. TRIVY_SCAN_VERSION=v0.71.0
 */
export class VersionSpec {
  public static readonly LATEST = new VersionSpec('latest', null);
  public static readonly PINNED = new VersionSpec('pinned', null);

  private readonly kind: 'latest' | 'pinned' | 'explicit';
  private readonly version: TrivyVersion | null;

  private constructor(kind: 'latest' | 'pinned' | 'explicit', version: TrivyVersion | null) {
    this.kind = kind;
    this.version = version;
  }

  public static explicit(version: TrivyVersion): VersionSpec {
    return new VersionSpec('explicit', version);
  }

  public isLatest(): boolean {
    return this.kind === 'latest';
  }

  public isPinned(): boolean {
    return this.kind === 'pinned';
  }

  public isExplicit(): boolean {
    return this.kind === 'explicit';
  }

  /** The exact version requested; only present for EXPLICIT specs. */
  public explicitVersion(): TrivyVersion {
    if (this.version === null) {
      throw new TypeError(`VersionSpec "${this.kind}" carries no explicit version`);
    }
    return this.version;
  }
}
