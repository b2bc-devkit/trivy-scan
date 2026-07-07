import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { TrivyVersion } from '../domain/TrivyVersion.js';

/**
 * Small JSON file remembering the most recently observed "latest" Trivy
 * version, so the GitHub redirect check runs at most once per TTL window
 * (default: 24 h) instead of on every invocation.
 */
export class VersionCheckCache {
  public static readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

  private readonly filePath: string;
  private readonly ttlMs: number;

  public constructor(filePath: string, ttlMs: number = VersionCheckCache.DEFAULT_TTL_MS) {
    this.filePath = filePath;
    this.ttlMs = ttlMs;
  }

  /** Returns the cached version only if it is still within the TTL window. */
  public async readFresh(): Promise<TrivyVersion | null> {
    const entry = await this.readEntry();
    if (entry === null || Date.now() - entry.checkedAtEpochMs >= this.ttlMs) {
      return null;
    }
    return entry.version;
  }

  /** Returns the cached version regardless of age (offline fallback). */
  public async readAny(): Promise<TrivyVersion | null> {
    const entry = await this.readEntry();
    return entry === null ? null : entry.version;
  }

  public async write(version: TrivyVersion): Promise<void> {
    const payload = JSON.stringify({ version: version.semver(), checkedAtEpochMs: Date.now() });
    await mkdir(dirname(this.filePath), { recursive: true });
    // Write-then-rename keeps concurrent readers from ever seeing a torn file.
    const temporaryPath = `${this.filePath}.tmp-${process.pid.toString(10)}`;
    await writeFile(temporaryPath, payload, 'utf8');
    await rename(temporaryPath, this.filePath);
  }

  private async readEntry(): Promise<{ version: TrivyVersion; checkedAtEpochMs: number } | null> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      const record = parsed as Record<string, unknown>;
      if (typeof record['version'] !== 'string' || typeof record['checkedAtEpochMs'] !== 'number') {
        return null;
      }
      return { version: TrivyVersion.of(record['version']), checkedAtEpochMs: record['checkedAtEpochMs'] };
    } catch {
      // Missing or corrupted cache files are simply treated as absent.
      return null;
    }
  }
}
