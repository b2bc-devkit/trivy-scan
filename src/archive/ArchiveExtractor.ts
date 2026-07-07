/** Extracts a single named entry from a verified release archive. */
export interface ArchiveExtractor {
  /**
   * Extracts `entryName` from `archivePath` and writes it to `destinationPath`.
   *
   * Implementations must only ever operate on archives that already passed
   * checksum verification.
   *
   * @throws ExtractionError when the archive is unreadable or lacks the entry.
   */
  extract(archivePath: string, entryName: string, destinationPath: string): Promise<void>;
}
