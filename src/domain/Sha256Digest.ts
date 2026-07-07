import { timingSafeEqual } from 'node:crypto';

/**
 * Immutable value object wrapping a SHA-256 digest in lowercase hex form.
 * Construction validates the format, so an instance is always a well-formed digest.
 */
export class Sha256Digest {
  private static readonly HEX_PATTERN = /^[0-9a-f]{64}$/;

  private readonly hex: string;

  private constructor(hex: string) {
    this.hex = hex;
  }

  public static ofHex(raw: string): Sha256Digest {
    const normalized = raw.trim().toLowerCase();
    if (!Sha256Digest.HEX_PATTERN.test(normalized)) {
      throw new RangeError(`not a SHA-256 hex digest: "${raw}"`);
    }
    return new Sha256Digest(normalized);
  }

  public equals(other: Sha256Digest): boolean {
    // Both buffers are always 64 bytes, satisfying timingSafeEqual's length requirement.
    return timingSafeEqual(Buffer.from(this.hex, 'ascii'), Buffer.from(other.hex, 'ascii'));
  }

  public toString(): string {
    return this.hex;
  }
}
