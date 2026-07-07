import type { Configuration } from '../../src/config/Configuration.js';
import { VersionSpec } from '../../src/config/VersionSpec.js';

/** Fixed-value {@link Configuration} for tests. */
export class FakeConfiguration implements Configuration {
  private readonly spec: VersionSpec;
  private readonly cacheOverride: string | null;

  public constructor(spec: VersionSpec = VersionSpec.LATEST, cacheOverride: string | null = null) {
    this.spec = spec;
    this.cacheOverride = cacheOverride;
  }

  public versionSpec(): VersionSpec {
    return this.spec;
  }

  public cacheDirectoryOverride(): string | null {
    return this.cacheOverride;
  }
}
