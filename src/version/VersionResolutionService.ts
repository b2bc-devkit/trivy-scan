import type { VersionResolver } from './VersionResolver.js';
import type { Configuration } from '../config/Configuration.js';
import type { Logger } from '../logging/Logger.js';
import { PinnedRelease } from '../config/PinnedRelease.js';
import { TrivyVersion } from '../domain/TrivyVersion.js';
import { TrivyScanError } from '../errors/TrivyScanError.js';

/**
 * Top-level version strategy:
 *
 *   EXPLICIT -> exactly what the user asked for
 *   PINNED   -> the release baked into this package (zero network calls)
 *   LATEST   -> newest upstream release, falling back to the pinned release
 *               whenever GitHub cannot be reached (e.g. air-gapped CI)
 */
export class VersionResolutionService implements VersionResolver {
  private readonly configuration: Configuration;
  private readonly latestResolver: VersionResolver;
  private readonly logger: Logger;

  public constructor(configuration: Configuration, latestResolver: VersionResolver, logger: Logger) {
    this.configuration = configuration;
    this.latestResolver = latestResolver;
    this.logger = logger;
  }

  public async resolve(): Promise<TrivyVersion> {
    const spec = this.configuration.versionSpec();
    if (spec.isExplicit()) {
      return spec.explicitVersion();
    }
    const pinned = TrivyVersion.of(PinnedRelease.VERSION);
    if (spec.isPinned()) {
      return pinned;
    }
    try {
      return await this.latestResolver.resolve();
    } catch (cause) {
      this.logger.warn(
        `falling back to the pinned Trivy ${pinned.tag()}: ${TrivyScanError.describe(cause)}`,
      );
      return pinned;
    }
  }
}
