import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Creates a scratch directory and removes it (recursively) on dispose. */
export class TempDirectory {
  private readonly directoryPath: string;

  private constructor(directoryPath: string) {
    this.directoryPath = directoryPath;
  }

  public static async create(): Promise<TempDirectory> {
    return new TempDirectory(await mkdtemp(join(tmpdir(), 'trivy-scan-test-')));
  }

  public path(): string {
    return this.directoryPath;
  }

  public join(...segments: string[]): string {
    return join(this.directoryPath, ...segments);
  }

  public async dispose(): Promise<void> {
    await rm(this.directoryPath, { recursive: true, force: true });
  }
}
