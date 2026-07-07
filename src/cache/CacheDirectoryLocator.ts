import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import type { Configuration } from '../config/Configuration.js';
import type { PlatformTarget } from '../domain/PlatformTarget.js';
import type { TrivyVersion } from '../domain/TrivyVersion.js';

/**
 * Computes where downloaded Trivy binaries live on disk.
 *
 * A per-user cache directory (rather than node_modules) is used deliberately:
 * `npx` installs into throwaway locations, while the user cache survives
 * across projects and npx invocations. Layout:
 *
 *   <root>/latest-version.json        - cached "latest release" lookup
 *   <root>/v0.72.0/trivy[.exe]        - verified, ready-to-run binary
 *   <root>/v0.72.0/checksums.txt      - official manifest (non-pinned versions)
 *
 * Roots per platform (overridable via TRIVY_SCAN_CACHE_DIR):
 *   Linux    $XDG_CACHE_HOME/trivy-scan  or  ~/.cache/trivy-scan
 *   macOS    ~/Library/Caches/trivy-scan
 *   Windows  %LOCALAPPDATA%\trivy-scan\Cache
 */
export class CacheDirectoryLocator {
  private static readonly DIRECTORY_NAME = 'trivy-scan';

  private readonly configuration: Configuration;
  private readonly env: Readonly<Record<string, string | undefined>>;
  private readonly nodePlatform: NodeJS.Platform;
  private readonly homeDirectory: string;

  public constructor(
    configuration: Configuration,
    env: Readonly<Record<string, string | undefined>> = process.env,
    nodePlatform: NodeJS.Platform = process.platform,
    homeDirectory: string = homedir(),
  ) {
    this.configuration = configuration;
    this.env = env;
    this.nodePlatform = nodePlatform;
    this.homeDirectory = homeDirectory;
  }

  public rootDirectory(): string {
    const override = this.configuration.cacheDirectoryOverride();
    if (override !== null) {
      return resolve(override);
    }
    if (this.nodePlatform === 'darwin') {
      return join(this.homeDirectory, 'Library', 'Caches', CacheDirectoryLocator.DIRECTORY_NAME);
    }
    if (this.nodePlatform === 'win32') {
      const localAppData = this.nonEmpty(this.env['LOCALAPPDATA']) ?? join(this.homeDirectory, 'AppData', 'Local');
      return join(localAppData, CacheDirectoryLocator.DIRECTORY_NAME, 'Cache');
    }
    const xdgCacheHome = this.nonEmpty(this.env['XDG_CACHE_HOME']) ?? join(this.homeDirectory, '.cache');
    return join(xdgCacheHome, CacheDirectoryLocator.DIRECTORY_NAME);
  }

  public versionDirectory(version: TrivyVersion): string {
    return join(this.rootDirectory(), version.tag());
  }

  public binaryPath(version: TrivyVersion, target: PlatformTarget): string {
    return join(this.versionDirectory(version), target.executableName());
  }

  public checksumManifestPath(version: TrivyVersion): string {
    return join(this.versionDirectory(version), 'checksums.txt');
  }

  public versionCheckFilePath(): string {
    return join(this.rootDirectory(), 'latest-version.json');
  }

  public async ensureVersionDirectory(version: TrivyVersion): Promise<string> {
    const directory = this.versionDirectory(version);
    await mkdir(directory, { recursive: true });
    return directory;
  }

  private nonEmpty(value: string | undefined): string | null {
    return value !== undefined && value.trim() !== '' ? value : null;
  }
}
