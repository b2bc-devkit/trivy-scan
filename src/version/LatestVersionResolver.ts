import type { VersionResolver } from './VersionResolver.js';
import type { VersionCheckCache } from './VersionCheckCache.js';
import type { HttpClient } from '../net/HttpClient.js';
import type { Logger } from '../logging/Logger.js';
import { TrivyReleaseUrls } from '../config/TrivyReleaseUrls.js';
import { TrivyVersion } from '../domain/TrivyVersion.js';
import { TrivyScanError } from '../errors/TrivyScanError.js';
import { VersionResolutionError } from '../errors/VersionResolutionError.js';

/**
 * Resolves the newest Trivy release by following the HTTP redirect of
 * `releases/latest` — a plain website endpoint with no API rate limits.
 * Results are cached (24 h TTL); on network failure the resolver degrades
 * gracefully to the last version it has ever seen.
 */
export class LatestVersionResolver implements VersionResolver {
  private static readonly TAG_PATTERN = /\/tag\/v(\d+\.\d+\.\d+)$/;

  private readonly httpClient: HttpClient;
  private readonly cache: VersionCheckCache;
  private readonly logger: Logger;

  public constructor(httpClient: HttpClient, cache: VersionCheckCache, logger: Logger) {
    this.httpClient = httpClient;
    this.cache = cache;
    this.logger = logger;
  }

  public async resolve(): Promise<TrivyVersion> {
    const fresh = await this.cache.readFresh();
    if (fresh !== null) {
      return fresh;
    }
    try {
      const version = await this.checkUpstream();
      await this.cache.write(version);
      return version;
    } catch (cause) {
      const stale = await this.cache.readAny();
      if (stale !== null) {
        this.logger.warn(
          `could not check the latest Trivy version (${TrivyScanError.describe(cause)}); using last known ${stale.tag()}`,
        );
        return stale;
      }
      throw new VersionResolutionError(
        `could not determine the latest Trivy version: ${TrivyScanError.describe(cause)}`,
      );
    }
  }

  private async checkUpstream(): Promise<TrivyVersion> {
    const location = await this.httpClient.fetchRedirectLocation(TrivyReleaseUrls.latestReleaseUrl());
    const match = LatestVersionResolver.TAG_PATTERN.exec(location);
    if (match === null || match[1] === undefined) {
      throw new VersionResolutionError(`unexpected redirect target for the latest release: ${location}`);
    }
    return TrivyVersion.of(match[1]);
  }
}
