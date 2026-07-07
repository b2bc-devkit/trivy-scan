import type { Configuration } from './Configuration.js';
import { VersionSpec } from './VersionSpec.js';
import { TrivyVersion } from '../domain/TrivyVersion.js';

/**
 * {@link Configuration} sourced from environment variables:
 *
 *   TRIVY_SCAN_VERSION    "latest" (default) | "pinned" | exact version ("v0.71.0")
 *   TRIVY_SCAN_CACHE_DIR  overrides the cache root directory
 *
 * Deliberately NOT command-line flags: the wrapper forwards every CLI argument
 * verbatim to Trivy, so the environment is the only configuration channel.
 */
export class EnvironmentConfiguration implements Configuration {
  public static readonly VERSION_VARIABLE = 'TRIVY_SCAN_VERSION';
  public static readonly CACHE_DIR_VARIABLE = 'TRIVY_SCAN_CACHE_DIR';

  private readonly env: Readonly<Record<string, string | undefined>>;

  public constructor(env: Readonly<Record<string, string | undefined>>) {
    this.env = env;
  }

  public static fromProcessEnv(): EnvironmentConfiguration {
    return new EnvironmentConfiguration(process.env);
  }

  public versionSpec(): VersionSpec {
    const raw = (this.env[EnvironmentConfiguration.VERSION_VARIABLE] ?? '').trim();
    if (raw === '' || raw.toLowerCase() === 'latest') {
      return VersionSpec.LATEST;
    }
    if (raw.toLowerCase() === 'pinned') {
      return VersionSpec.PINNED;
    }
    // TrivyVersion.of() throws a descriptive ConfigurationError on malformed input.
    return VersionSpec.explicit(TrivyVersion.of(raw));
  }

  public cacheDirectoryOverride(): string | null {
    const raw = (this.env[EnvironmentConfiguration.CACHE_DIR_VARIABLE] ?? '').trim();
    return raw === '' ? null : raw;
  }
}
