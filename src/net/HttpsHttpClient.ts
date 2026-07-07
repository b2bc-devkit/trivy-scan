import { createWriteStream } from 'node:fs';
import { get } from 'node:https';
import type { IncomingMessage } from 'node:http';
import { Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { DownloadProgressListener, HttpClient } from './HttpClient.js';
import { DownloadError } from '../errors/DownloadError.js';
import { TrivyScanError } from '../errors/TrivyScanError.js';

/**
 * {@link HttpClient} built purely on Node's native `https` module — no HTTP
 * libraries, no `fetch` polyfills. Follows redirects manually (GitHub release
 * downloads redirect to a CDN), enforces HTTPS end-to-end and applies socket
 * timeouts so a stalled connection can never hang a build forever.
 */
export class HttpsHttpClient implements HttpClient {
  private static readonly MAX_REDIRECTS = 10;
  private static readonly SOCKET_TIMEOUT_MS = 30_000;
  private static readonly MAX_TEXT_BYTES = 4 * 1024 * 1024;
  private static readonly REDIRECT_STATUS_CODES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);
  private static readonly USER_AGENT = 'trivy-scan-npm-wrapper (+https://github.com/b2bc-devkit/trivy-scan)';

  public async fetchRedirectLocation(url: string): Promise<string> {
    const response = await this.openUrl(url);
    const status = response.statusCode ?? 0;
    const location = response.headers.location;
    response.resume(); // Discard the body; only the headers matter here.
    if (!HttpsHttpClient.REDIRECT_STATUS_CODES.has(status) || location === undefined) {
      throw new DownloadError(`expected a redirect from ${url}, got HTTP ${status}`);
    }
    return new URL(location, url).toString();
  }

  public async fetchText(url: string): Promise<string> {
    const response = await this.openFollowingRedirects(url, HttpsHttpClient.MAX_REDIRECTS);
    return await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let received = 0;
      response.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > HttpsHttpClient.MAX_TEXT_BYTES) {
          response.destroy();
          reject(new DownloadError(`response from ${url} exceeded ${HttpsHttpClient.MAX_TEXT_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      response.on('error', (cause) => reject(new DownloadError(`download of ${url} failed: ${cause.message}`)));
    });
  }

  public async downloadFile(url: string, destinationPath: string, listener?: DownloadProgressListener): Promise<void> {
    const response = await this.openFollowingRedirects(url, HttpsHttpClient.MAX_REDIRECTS);
    const totalBytes = HttpsHttpClient.contentLength(response);
    let receivedBytes = 0;
    const progressCounter = new Transform({
      transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
        receivedBytes += chunk.length;
        listener?.onProgress(receivedBytes, totalBytes);
        callback(null, chunk);
      },
    });
    try {
      await pipeline(response, progressCounter, createWriteStream(destinationPath));
    } catch (cause) {
      throw new DownloadError(`download of ${url} failed: ${TrivyScanError.describe(cause)}`);
    }
    listener?.onComplete(receivedBytes);
  }

  /** Opens a URL and transparently follows up to `redirectsLeft` redirects. */
  private async openFollowingRedirects(url: string, redirectsLeft: number): Promise<IncomingMessage> {
    const response = await this.openUrl(url);
    const status = response.statusCode ?? 0;
    if (HttpsHttpClient.REDIRECT_STATUS_CODES.has(status)) {
      const location = response.headers.location;
      response.resume();
      if (location === undefined) {
        throw new DownloadError(`redirect from ${url} carried no Location header`);
      }
      if (redirectsLeft <= 0) {
        throw new DownloadError(`too many redirects while fetching ${url}`);
      }
      return this.openFollowingRedirects(new URL(location, url).toString(), redirectsLeft - 1);
    }
    if (status !== 200) {
      response.resume();
      throw new DownloadError(`HTTP ${status} for ${url}`);
    }
    return response;
  }

  /** Performs a single GET request and resolves once response headers arrive. */
  private openUrl(url: string): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject) => {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        reject(new DownloadError(`refusing to fetch non-HTTPS URL: ${url}`));
        return;
      }
      const request = get(
        parsed,
        { headers: { 'user-agent': HttpsHttpClient.USER_AGENT, accept: '*/*' } },
        (response) => resolve(response),
      );
      request.setTimeout(HttpsHttpClient.SOCKET_TIMEOUT_MS, () => {
        request.destroy(new Error(`socket idle for ${HttpsHttpClient.SOCKET_TIMEOUT_MS} ms`));
      });
      request.on('error', (cause) => {
        reject(new DownloadError(`request to ${url} failed: ${cause.message}`));
      });
    });
  }

  private static contentLength(response: IncomingMessage): number | null {
    const raw = response.headers['content-length'];
    const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
}
