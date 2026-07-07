import { TrivyScanError } from './TrivyScanError.js';

/** Raised when a verified archive cannot be extracted or lacks the expected binary. */
export class ExtractionError extends TrivyScanError {
  public constructor(message: string) {
    super(message);
  }
}
