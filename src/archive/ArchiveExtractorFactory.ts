import type { ArchiveExtractor } from './ArchiveExtractor.js';
import { TarGzArchiveExtractor } from './TarGzArchiveExtractor.js';
import { ZipArchiveExtractor } from './ZipArchiveExtractor.js';
import { ArchiveFormat } from '../domain/ArchiveFormat.js';
import { ExtractionError } from '../errors/ExtractionError.js';

/** Selects the right {@link ArchiveExtractor} for an artifact's format. */
export class ArchiveExtractorFactory {
  private readonly tarGzExtractor: ArchiveExtractor = new TarGzArchiveExtractor();
  private readonly zipExtractor: ArchiveExtractor = new ZipArchiveExtractor();

  public forFormat(format: ArchiveFormat): ArchiveExtractor {
    switch (format) {
      case ArchiveFormat.TAR_GZ:
        return this.tarGzExtractor;
      case ArchiveFormat.ZIP:
        return this.zipExtractor;
      default:
        throw new ExtractionError(`unsupported archive format: ${String(format)}`);
    }
  }
}
