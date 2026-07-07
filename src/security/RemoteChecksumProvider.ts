import { readFile, rename, writeFile } from 'node:fs/promises';

import type { ChecksumProvider } from './ChecksumProvider.js';
import { ChecksumFile } from './ChecksumFile.js';
import { ProvidedChecksum } from './ProvidedChecksum.js';
import type { CacheDirectoryLocator } from '../cache/CacheDirectoryLocator.js';
import { TrivyReleaseUrls } from '../config/TrivyReleaseUrls.js';
import type { TrivyVersion } from '../domain/TrivyVersion.js';
import { ChecksumUnavailableError } from '../errors/ChecksumUnavailableError.js';
import type { HttpClient } from '../net/HttpClient.js';

/**
 * Obtains checksums for releases that are NOT pinned into the package (i.e.
 * dynamically resolved "latest" or explicitly requested versions) from the
 * official `trivy_<version>_checksums.txt` manifest of that release.
 *
 * The manifest is fetched over TLS from GitHub once per version and then
 * cached on disk next to the binary it vouches for.
 */
export class RemoteChecksumProvider implements ChecksumProvider {
  private readonly httpClient: HttpClient;
  private readonly cacheLocator: CacheDirectoryLocator;

  public constructor(httpClient: HttpClient, cacheLocator: CacheDirectoryLocator) {
    this.httpClient = httpClient;
    this.cacheLocator = cacheLocator;
  }

  public async checksumFor(version: TrivyVersion, assetName: string): Promise<ProvidedChecksum> {
    const manifest = ChecksumFile.parse(await this.loadManifestText(version));
    const digest = manifest.digestFor(assetName);
    if (digest === null) {
      throw new ChecksumUnavailableError(
        `the official checksum manifest for Trivy ${version.tag()} has no entry for ${assetName}`,
      );
    }
    return new ProvidedChecksum(digest, `official release manifest ${TrivyReleaseUrls.checksumManifestName(version)}`);
  }

  private async loadManifestText(version: TrivyVersion): Promise<string> {
    const manifestPath = this.cacheLocator.checksumManifestPath(version);
    try {
      return await readFile(manifestPath, 'utf8');
    } catch {
      // Not cached yet — fall through to a fresh download.
    }
    const text = await this.httpClient.fetchText(TrivyReleaseUrls.checksumManifestUrl(version));
    await this.cacheLocator.ensureVersionDirectory(version);
    const temporaryPath = `${manifestPath}.tmp-${process.pid.toString(10)}`;
    await writeFile(temporaryPath, text, 'utf8');
    await rename(temporaryPath, manifestPath);
    return text;
  }
}
