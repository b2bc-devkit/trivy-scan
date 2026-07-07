import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { Sha256Digest } from '../domain/Sha256Digest.js';

/** Computes SHA-256 digests of files via streaming (constant memory). */
export class Sha256FileHasher {
  public async hash(filePath: string): Promise<Sha256Digest> {
    const hash = createHash('sha256');
    await pipeline(createReadStream(filePath), hash);
    return Sha256Digest.ofHex(hash.digest('hex'));
  }
}
