import { Sha256Digest } from '../domain/Sha256Digest.js';

/**
 * Parsed representation of a `sha256sum`-style checksum manifest, the format
 * Trivy publishes as `trivy_<version>_checksums.txt`:
 *
 *   <64 hex chars><whitespace><artifact file name>
 */
export class ChecksumFile {
  private static readonly LINE_PATTERN = /^([0-9a-fA-F]{64})\s+\*?(.+)$/;

  private readonly entries: ReadonlyMap<string, Sha256Digest>;

  private constructor(entries: ReadonlyMap<string, Sha256Digest>) {
    this.entries = entries;
  }

  public static parse(text: string): ChecksumFile {
    const entries = new Map<string, Sha256Digest>();
    for (const line of text.split('\n')) {
      const match = ChecksumFile.LINE_PATTERN.exec(line.trim());
      if (match !== null && match[1] !== undefined && match[2] !== undefined) {
        entries.set(match[2].trim(), Sha256Digest.ofHex(match[1]));
      }
    }
    return new ChecksumFile(entries);
  }

  public digestFor(assetName: string): Sha256Digest | null {
    return this.entries.get(assetName) ?? null;
  }

  public size(): number {
    return this.entries.size;
  }
}
