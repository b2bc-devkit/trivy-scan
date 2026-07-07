import { TrivyScanError } from './TrivyScanError.js';

/** Raised when user-provided configuration (environment variables) is invalid. */
export class ConfigurationError extends TrivyScanError {
  public constructor(message: string) {
    super(message);
  }
}
