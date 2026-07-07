import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { test } from 'node:test';

import { StderrLogger } from '../../src/logging/StderrLogger.js';

class CapturingStream extends Writable {
  public captured = '';

  public override _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.captured += chunk.toString('utf8');
    callback();
  }
}

test('prefixes every line and labels severities', () => {
  const stream = new CapturingStream();
  const logger = new StderrLogger(stream);
  logger.info('setting up');
  logger.warn('heads up');
  logger.error('first line\nsecond line');
  assert.equal(
    stream.captured,
    [
      'trivy-scan: setting up',
      'trivy-scan: warning: heads up',
      'trivy-scan: error: first line',
      'trivy-scan: second line',
    ].join('\n') + '\n',
  );
});
