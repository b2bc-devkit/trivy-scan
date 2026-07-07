/**
 * Maintainer tool: re-pins the package to a Trivy release.
 *
 *   npm run update-pinned              # pin to the latest release
 *   npm run update-pinned -- v0.72.0   # pin to an explicit release
 *
 * Downloads the official checksum manifest of the chosen release, extracts
 * the SHA-256 checksums of every artifact in the supported-platform matrix
 * and regenerates src/config/PinnedRelease.ts. Afterwards run the test suite
 * and publish a new package version.
 *
 * This script is a development-time tool; it is never executed on user
 * machines (the published package contains only dist/src).
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TrivyReleaseUrls } from '../src/config/TrivyReleaseUrls.js';
import { TrivyVersion } from '../src/domain/TrivyVersion.js';
import { HttpsHttpClient } from '../src/net/HttpsHttpClient.js';
import { NodePlatformResolver } from '../src/platform/NodePlatformResolver.js';
import { ChecksumFile } from '../src/security/ChecksumFile.js';

class PinnedReleaseGenerator {
  private static readonly TAG_PATTERN = /\/tag\/v(\d+\.\d+\.\d+)$/;

  private readonly httpClient = new HttpsHttpClient();

  public async run(requestedVersion: string | undefined): Promise<void> {
    const version = requestedVersion === undefined ? await this.resolveLatest() : TrivyVersion.of(requestedVersion);
    process.stderr.write(`pinning Trivy ${version.tag()}\n`);

    const manifestText = await this.httpClient.fetchText(TrivyReleaseUrls.checksumManifestUrl(version));
    const manifest = ChecksumFile.parse(manifestText);

    const assetNames = [...new Set(NodePlatformResolver.supportedAssetSuffixes())]
      .map((suffix) => `trivy_${version.semver()}_${suffix}`)
      .sort();
    const entries = assetNames.map((assetName) => {
      const digest = manifest.digestFor(assetName);
      if (digest === null) {
        throw new Error(
          `release ${version.tag()} publishes no artifact named ${assetName} — ` +
            'has Trivy changed its artifact naming? Update NodePlatformResolver first.',
        );
      }
      return `    '${assetName}': '${digest.toString()}',`;
    });

    const outputPath = join(PinnedReleaseGenerator.projectRoot(), 'src', 'config', 'PinnedRelease.ts');
    await writeFile(outputPath, PinnedReleaseGenerator.render(version, entries), 'utf8');
    process.stderr.write(`wrote ${outputPath} (${entries.length} artifacts)\n`);
    process.stderr.write('next: npm run build && npm test && npm run test:integration\n');
  }

  private async resolveLatest(): Promise<TrivyVersion> {
    const location = await this.httpClient.fetchRedirectLocation(TrivyReleaseUrls.latestReleaseUrl());
    const match = PinnedReleaseGenerator.TAG_PATTERN.exec(location);
    if (match === null || match[1] === undefined) {
      throw new Error(`unexpected redirect target for the latest release: ${location}`);
    }
    return TrivyVersion.of(match[1]);
  }

  /** dist/scripts/update-pinned.js -> project root is two directories up. */
  private static projectRoot(): string {
    return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  }

  private static render(version: TrivyVersion, entries: readonly string[]): string {
    return `// ============================================================================
// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
//
// Regenerate with:  npm run update-pinned [-- v<X.Y.Z>]
//
// The checksums below are copied verbatim from the official release manifest
// (trivy_${version.semver()}_checksums.txt) published by aquasecurity/trivy on GitHub.
// ============================================================================

/**
 * The Trivy release this package is pinned to, together with the SHA-256
 * checksum of every supported release artifact.
 *
 * The pinned release serves as the offline-safe fallback whenever the latest
 * version cannot (or must not) be resolved over the network, and its baked-in
 * checksums allow artifact verification without trusting any live endpoint.
 */
export class PinnedRelease {
  /** Pinned Trivy version (without the "v" prefix). */
  public static readonly VERSION = '${version.semver()}';

  /** SHA-256 checksums of the supported artifacts, keyed by artifact file name. */
  private static readonly CHECKSUMS: Readonly<Record<string, string>> = {
${entries.join('\n')}
  };

  private constructor() {
    // Static holder class — never instantiated.
  }

  /** Returns the pinned checksum for the given artifact name, if known. */
  public static checksumFor(assetName: string): string | undefined {
    return Object.prototype.hasOwnProperty.call(PinnedRelease.CHECKSUMS, assetName)
      ? PinnedRelease.CHECKSUMS[assetName]
      : undefined;
  }

  /** All artifact names that have a pinned checksum. */
  public static assetNames(): readonly string[] {
    return Object.keys(PinnedRelease.CHECKSUMS);
  }
}
`;
  }
}

await new PinnedReleaseGenerator().run(process.argv[2]);
