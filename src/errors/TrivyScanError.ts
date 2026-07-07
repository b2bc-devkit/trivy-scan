/**
 * Base class of every error deliberately raised by the trivy-scan wrapper.
 *
 * The CLI layer treats {@link TrivyScanError} instances as expected failure
 * modes (printed without a stack trace), while anything else is reported as
 * an unexpected internal error.
 */
export abstract class TrivyScanError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }

  /** Renders an unknown thrown value as a human-readable message. */
  public static describe(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
  }
}
