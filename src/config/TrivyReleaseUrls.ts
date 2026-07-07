import type { TrivyVersion } from '../domain/TrivyVersion.js';

/**
 * Static utility class building all URLs of the official Trivy release channel.
 *
 * Only `github.com/aquasecurity/trivy/releases/...` endpoints are used — never
 * the GitHub REST API — so the wrapper is immune to API rate limits in CI.
 */
export class TrivyReleaseUrls {
  public static readonly RELEASES_BASE_URL = 'https://github.com/aquasecurity/trivy/releases';

  private constructor() {
    // Static holder class — never instantiated.
  }

  /** Redirects (HTTP 302) to the tag page of the newest release. */
  public static latestReleaseUrl(): string {
    return `${TrivyReleaseUrls.RELEASES_BASE_URL}/latest`;
  }

  /** Direct download URL of a release artifact. */
  public static downloadUrl(version: TrivyVersion, assetName: string): string {
    return `${TrivyReleaseUrls.RELEASES_BASE_URL}/download/${version.tag()}/${assetName}`;
  }

  /** File name of the official checksum manifest of a release. */
  public static checksumManifestName(version: TrivyVersion): string {
    return `trivy_${version.semver()}_checksums.txt`;
  }

  /** Download URL of the official checksum manifest of a release. */
  public static checksumManifestUrl(version: TrivyVersion): string {
    return TrivyReleaseUrls.downloadUrl(version, TrivyReleaseUrls.checksumManifestName(version));
  }
}
