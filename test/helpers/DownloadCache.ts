import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DownloadProgressListener, HttpClient } from '../../src/net/HttpClient.js';

/**
 * HttpClient decorator that memoizes artifact downloads in
 * `<repo>/test/.download-cache` (gitignored), so repeated integration test
 * runs do not re-download ~180 MB of release artifacts. Cached files still
 * pass through checksum verification downstream, so a stale or corrupted
 * cache entry cannot poison a test silently.
 */
export class DownloadCache implements HttpClient {
  private readonly delegate: HttpClient;
  private readonly cacheDirectory: string;

  public constructor(delegate: HttpClient) {
    this.delegate = delegate;
    this.cacheDirectory = DownloadCache.defaultDirectory();
  }

  /** dist/test/helpers -> repo root -> test/.download-cache */
  private static defaultDirectory(): string {
    const helpersDirectory = dirname(fileURLToPath(import.meta.url));
    const repoRoot = dirname(dirname(dirname(helpersDirectory)));
    return join(repoRoot, 'test', '.download-cache');
  }

  public fetchRedirectLocation(url: string): Promise<string> {
    return this.delegate.fetchRedirectLocation(url);
  }

  public fetchText(url: string): Promise<string> {
    return this.delegate.fetchText(url);
  }

  public async downloadFile(url: string, destinationPath: string, listener?: DownloadProgressListener): Promise<void> {
    const cachedPath = join(this.cacheDirectory, basename(new URL(url).pathname));
    if (existsSync(cachedPath)) {
      await copyFile(cachedPath, destinationPath);
      return;
    }
    await this.delegate.downloadFile(url, destinationPath, listener);
    await mkdir(this.cacheDirectory, { recursive: true });
    await copyFile(destinationPath, cachedPath);
  }
}
