/** Receives download progress callbacks (e.g. to render a progress bar). */
export interface DownloadProgressListener {
  onProgress(receivedBytes: number, totalBytes: number | null): void;
  onComplete(receivedBytes: number): void;
}

/** Minimal HTTPS abstraction needed by the wrapper (mockable in tests). */
export interface HttpClient {
  /**
   * Performs a single request WITHOUT following redirects and returns the
   * absolute `Location` target. Used for GitHub's `releases/latest` endpoint,
   * whose redirect encodes the newest version tag.
   */
  fetchRedirectLocation(url: string): Promise<string>;

  /** Downloads a small text resource (e.g. a checksum manifest) into memory. */
  fetchText(url: string): Promise<string>;

  /** Streams a (potentially large) resource to disk. */
  downloadFile(url: string, destinationPath: string, listener?: DownloadProgressListener): Promise<void>;
}
