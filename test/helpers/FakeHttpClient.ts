import type { DownloadProgressListener, HttpClient } from '../../src/net/HttpClient.js';

/** Programmable {@link HttpClient} double counting every outgoing request. */
export class FakeHttpClient implements HttpClient {
  public redirectLocation: string | null = null;
  public textBody: string | null = null;
  public failure: Error | null = null;
  public redirectCalls = 0;
  public textCalls = 0;
  public downloadCalls = 0;

  public fetchRedirectLocation(_url: string): Promise<string> {
    this.redirectCalls += 1;
    if (this.failure !== null) {
      return Promise.reject(this.failure);
    }
    if (this.redirectLocation === null) {
      return Promise.reject(new Error('FakeHttpClient: no redirect configured'));
    }
    return Promise.resolve(this.redirectLocation);
  }

  public fetchText(_url: string): Promise<string> {
    this.textCalls += 1;
    if (this.failure !== null) {
      return Promise.reject(this.failure);
    }
    if (this.textBody === null) {
      return Promise.reject(new Error('FakeHttpClient: no text body configured'));
    }
    return Promise.resolve(this.textBody);
  }

  public downloadFile(_url: string, _destinationPath: string, _listener?: DownloadProgressListener): Promise<void> {
    this.downloadCalls += 1;
    if (this.failure !== null) {
      return Promise.reject(this.failure);
    }
    return Promise.reject(new Error('FakeHttpClient: downloadFile not supported'));
  }
}
