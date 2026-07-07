import type { Sha256Digest } from '../domain/Sha256Digest.js';

/** A trusted checksum together with a human-readable note about where it came from. */
export class ProvidedChecksum {
  private readonly checksumDigest: Sha256Digest;
  private readonly provenanceNote: string;

  public constructor(digest: Sha256Digest, provenance: string) {
    this.checksumDigest = digest;
    this.provenanceNote = provenance;
  }

  public digest(): Sha256Digest {
    return this.checksumDigest;
  }

  /** e.g. "pinned inside the trivy-scan package" or "official release manifest". */
  public provenance(): string {
    return this.provenanceNote;
  }
}
