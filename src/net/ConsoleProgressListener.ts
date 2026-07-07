import type { DownloadProgressListener } from './HttpClient.js';

/**
 * Renders download progress on STDERR.
 *
 * On an interactive terminal it redraws a single throttled progress line;
 * in CI (non-TTY) it stays silent during transfer and prints one summary
 * line when the download completes, keeping logs clean.
 */
export class ConsoleProgressListener implements DownloadProgressListener {
  private static readonly REDRAW_INTERVAL_MS = 150;

  private readonly label: string;
  private readonly output: NodeJS.WriteStream;
  private lastRenderedAtEpochMs = 0;

  public constructor(label: string, output: NodeJS.WriteStream = process.stderr) {
    this.label = label;
    this.output = output;
  }

  public onProgress(receivedBytes: number, totalBytes: number | null): void {
    if (!this.output.isTTY) {
      return;
    }
    const now = Date.now();
    if (now - this.lastRenderedAtEpochMs < ConsoleProgressListener.REDRAW_INTERVAL_MS) {
      return;
    }
    this.lastRenderedAtEpochMs = now;
    const progress =
      totalBytes === null
        ? ConsoleProgressListener.megabytes(receivedBytes)
        : `${ConsoleProgressListener.megabytes(receivedBytes)} / ${ConsoleProgressListener.megabytes(totalBytes)} (${Math.floor((receivedBytes / totalBytes) * 100)}%)`;
    this.output.write(`\rtrivy-scan: downloading ${this.label} … ${progress}   `);
  }

  public onComplete(receivedBytes: number): void {
    const summary = `trivy-scan: downloaded ${this.label} (${ConsoleProgressListener.megabytes(receivedBytes)})`;
    if (this.output.isTTY) {
      this.output.write(`\r${summary}${' '.repeat(24)}\n`);
    } else {
      this.output.write(`${summary}\n`);
    }
  }

  private static megabytes(bytes: number): string {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
}
