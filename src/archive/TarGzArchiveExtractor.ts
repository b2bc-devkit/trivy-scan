import { access, mkdtemp, rename, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { extract as extractTar } from 'tar';

import type { ArchiveExtractor } from './ArchiveExtractor.js';
import { ExtractionError } from '../errors/ExtractionError.js';
import { TrivyScanError } from '../errors/TrivyScanError.js';

/**
 * Extracts one entry from a `.tar.gz` artifact (Linux/macOS releases) using
 * the `tar` package — the same battle-tested implementation npm itself uses.
 *
 * The entry is unpacked into a private staging directory first and then moved
 * to its destination, so concurrent installs never collide and a crash never
 * leaves a half-written file at the final path.
 */
export class TarGzArchiveExtractor implements ArchiveExtractor {
  public async extract(archivePath: string, entryName: string, destinationPath: string): Promise<void> {
    const stagingDirectory = await mkdtemp(join(dirname(destinationPath), '.extract-'));
    try {
      await extractTar({
        file: archivePath,
        cwd: stagingDirectory,
        strict: true,
        // Unpack nothing but the requested entry (also neutralizes any
        // hostile paths, as unmatched entries are skipped entirely).
        filter: (entryPath) => TarGzArchiveExtractor.normalize(entryPath) === entryName,
      });
      const extractedPath = join(stagingDirectory, entryName);
      if (!(await TarGzArchiveExtractor.exists(extractedPath))) {
        throw new ExtractionError(`"${entryName}" not found inside ${basename(archivePath)}`);
      }
      await rename(extractedPath, destinationPath);
    } catch (cause) {
      throw cause instanceof TrivyScanError
        ? cause
        : new ExtractionError(`failed to extract ${basename(archivePath)}: ${TrivyScanError.describe(cause)}`);
    } finally {
      await rm(stagingDirectory, { recursive: true, force: true });
    }
  }

  private static normalize(entryPath: string): string {
    return entryPath.replace(/^\.\//, '');
  }

  private static async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
}
