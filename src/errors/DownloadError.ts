import { TrivyScanError } from './TrivyScanError.js';

/** Raised when an HTTPS request or file download fails (network, HTTP status, timeout). */
export class DownloadError extends TrivyScanError {
  public constructor(message: string) {
    super(message);
  }
}
