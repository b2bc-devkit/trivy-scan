import { createWriteStream } from 'node:fs';
import { basename } from 'node:path';
import { pipeline } from 'node:stream/promises';
import unzipper from 'unzipper';

import type { ArchiveExtractor } from './ArchiveExtractor.js';
import { ExtractionError } from '../errors/ExtractionError.js';
import { TrivyScanError } from '../errors/TrivyScanError.js';

/**
 * Extracts one entry from a `.zip` artifact (Windows releases) using the
 * `unzipper` package. Reads the central directory without loading the whole
 * archive into memory, then streams just the requested entry to disk.
 */
export class ZipArchiveExtractor implements ArchiveExtractor {
  public async extract(archivePath: string, entryName: string, destinationPath: string): Promise<void> {
    try {
      const directory = await unzipper.Open.file(archivePath);
      const entry = directory.files.find(
        (file) => file.type === 'File' && ZipArchiveExtractor.normalize(file.path) === entryName,
      );
      if (entry === undefined) {
        throw new ExtractionError(`"${entryName}" not found inside ${basename(archivePath)}`);
      }
      await pipeline(entry.stream(), createWriteStream(destinationPath));
    } catch (cause) {
      throw cause instanceof TrivyScanError
        ? cause
        : new ExtractionError(`failed to extract ${basename(archivePath)}: ${TrivyScanError.describe(cause)}`);
    }
  }

  private static normalize(entryPath: string): string {
    return entryPath.replace(/^\.\//, '');
  }
}
