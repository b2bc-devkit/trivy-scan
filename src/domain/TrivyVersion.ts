import { ConfigurationError } from '../errors/ConfigurationError.js';

/**
 * Immutable value object representing a concrete Trivy release version.
 *
 * Accepts both "0.72.0" and "v0.72.0" on input and normalizes internally,
 * rejecting anything that is not a plain X.Y.Z version (which also guards the
 * download URL and cache paths built from it against injection).
 */
export class TrivyVersion {
  private static readonly PATTERN = /^v?(\d+\.\d+\.\d+)$/;

  /** Normalized version without the "v" prefix, e.g. "0.72.0". */
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static of(raw: string): TrivyVersion {
    const match = TrivyVersion.PATTERN.exec(raw.trim());
    if (match === null || match[1] === undefined) {
      throw new ConfigurationError(`invalid Trivy version "${raw}" — expected the form "0.72.0" or "v0.72.0"`);
    }
    return new TrivyVersion(match[1]);
  }

  /** Version without prefix, e.g. "0.72.0" (used in artifact file names). */
  public semver(): string {
    return this.value;
  }

  /** Git tag form, e.g. "v0.72.0" (used in release URLs and cache paths). */
  public tag(): string {
    return `v${this.value}`;
  }

  public equals(other: TrivyVersion): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.tag();
  }
}
