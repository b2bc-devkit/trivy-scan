import { randomBytes } from 'node:crypto';
import { access, chmod, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { ArchiveExtractorFactory } from '../archive/ArchiveExtractorFactory.js';
import type { CacheDirectoryLocator } from '../cache/CacheDirectoryLocator.js';
import { TrivyReleaseUrls } from '../config/TrivyReleaseUrls.js';
import type { PlatformTarget } from '../domain/PlatformTarget.js';
import type { TrivyVersion } from '../domain/TrivyVersion.js';
import type { Logger } from '../logging/Logger.js';
import { ConsoleProgressListener } from '../net/ConsoleProgressListener.js';
import type { HttpClient } from '../net/HttpClient.js';
import type { PlatformResolver } from '../platform/PlatformResolver.js';
import type { ChecksumProvider } from '../security/ChecksumProvider.js';
import type { ChecksumVerifier } from '../security/ChecksumVerifier.js';
import type { VersionResolver } from '../version/VersionResolver.js';

/**
 * Orchestrates the lazy-download-and-cache lifecycle of the Trivy binary:
 *
 *   1. resolve host platform and desired version
 *   2. cache hit?  -> return the binary path immediately (zero network, zero output)
 *   3. cache miss  -> obtain trusted checksum
 *                  -> download archive to a unique temp file
 *                  -> verify SHA-256 (mismatch aborts hard; file is discarded)
 *                  -> extract just the trivy executable, chmod +x on Unix
 *                  -> atomically move it into its final cache location
 *
 * Every temp artifact carries a pid+random suffix and the final step is a
 * rename, so concurrent invocations (e.g. parallel CI jobs sharing a cache)
 * cannot corrupt each other: one of them simply wins the last rename.
 */
export class TrivyInstaller {
  private readonly platformResolver: PlatformResolver;
  private readonly versionResolver: VersionResolver;
  private readonly checksumProvider: ChecksumProvider;
  private readonly checksumVerifier: ChecksumVerifier;
  private readonly extractorFactory: ArchiveExtractorFactory;
  private readonly cacheLocator: CacheDirectoryLocator;
  private readonly httpClient: HttpClient;
  private readonly logger: Logger;

  public constructor(
    platformResolver: PlatformResolver,
    versionResolver: VersionResolver,
    checksumProvider: ChecksumProvider,
    checksumVerifier: ChecksumVerifier,
    extractorFactory: ArchiveExtractorFactory,
    cacheLocator: CacheDirectoryLocator,
    httpClient: HttpClient,
    logger: Logger,
  ) {
    this.platformResolver = platformResolver;
    this.versionResolver = versionResolver;
    this.checksumProvider = checksumProvider;
    this.checksumVerifier = checksumVerifier;
    this.extractorFactory = extractorFactory;
    this.cacheLocator = cacheLocator;
    this.httpClient = httpClient;
    this.logger = logger;
  }

  /** Returns the path to a verified, executable Trivy binary, installing it if needed. */
  public async ensureInstalled(): Promise<string> {
    const target = this.platformResolver.resolve();
    const version = await this.versionResolver.resolve();
    const binaryPath = this.cacheLocator.binaryPath(version, target);
    if (await TrivyInstaller.exists(binaryPath)) {
      return binaryPath;
    }
    return this.install(version, target, binaryPath);
  }

  private async install(version: TrivyVersion, target: PlatformTarget, binaryPath: string): Promise<string> {
    const assetName = target.assetNameFor(version);
    const downloadUrl = TrivyReleaseUrls.downloadUrl(version, assetName);

    // Fail fast: without a trusted checksum nothing is ever downloaded.
    const checksum = await this.checksumProvider.checksumFor(version, assetName);

    const versionDirectory = await this.cacheLocator.ensureVersionDirectory(version);
    const temporarySuffix = `.tmp-${process.pid.toString(10)}-${randomBytes(4).toString('hex')}`;
    const archivePath = join(versionDirectory, assetName + temporarySuffix);
    const stagedBinaryPath = binaryPath + temporarySuffix;

    this.logger.info(`Trivy ${version.tag()} is not cached yet — running one-time setup for this version.`);
    this.logger.info(`downloading ${downloadUrl}`);
    try {
      await this.httpClient.downloadFile(downloadUrl, archivePath, new ConsoleProgressListener(assetName));

      this.logger.info(`verifying SHA-256 (${checksum.provenance()})`);
      await this.checksumVerifier.verifyOrThrow(archivePath, checksum, assetName);

      this.logger.info(`checksum OK — extracting ${target.executableName()}`);
      const extractor = this.extractorFactory.forFormat(target.archiveFormat());
      await extractor.extract(archivePath, target.executableName(), stagedBinaryPath);
      if (!target.isWindows()) {
        await chmod(stagedBinaryPath, 0o755);
      }
      await TrivyInstaller.moveIntoPlace(stagedBinaryPath, binaryPath);

      this.logger.info(`Trivy ${version.tag()} installed at ${binaryPath}`);
      return binaryPath;
    } finally {
      // Never leave partially processed artifacts behind — success or failure.
      await rm(archivePath, { force: true });
      await rm(stagedBinaryPath, { force: true });
    }
  }

  /** Atomic-rename with tolerance for a concurrent installer having won the race. */
  private static async moveIntoPlace(fromPath: string, toPath: string): Promise<void> {
    try {
      await rename(fromPath, toPath);
    } catch (cause) {
      if (await TrivyInstaller.exists(toPath)) {
        return;
      }
      throw cause;
    }
  }

  private static async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
}
