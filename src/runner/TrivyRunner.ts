import { spawn } from 'node:child_process';
import { constants as osConstants } from 'node:os';

import { ProcessSpawnError } from '../errors/ProcessSpawnError.js';

/**
 * Executes the Trivy binary as a fully transparent child process.
 *
 * Guarantees demanded of a wrapper that must be indistinguishable from the
 * real thing:
 *  - arguments are passed through as an untouched array (never re-parsed,
 *    never re-quoted, no shell involved)
 *  - stdio is inherited, preserving colors, progress bars, interactivity and
 *    the ability to redirect stdout (e.g. `-f json > result.json`)
 *  - Trivy's exit code is propagated 1:1 (critical for `--exit-code` CI gates)
 *  - signal-caused deaths are re-raised so callers observe the same signal
 */
export class TrivyRunner {
  public run(binaryPath: string, args: readonly string[]): Promise<number> {
    return new Promise<number>((resolvePromise, rejectPromise) => {
      const child = spawn(binaryPath, args, { stdio: 'inherit' });

      // Ctrl+C: the terminal delivers SIGINT to the whole foreground process
      // group, so Trivy receives it directly. The wrapper just stays alive
      // until Trivy finishes its graceful shutdown, then mirrors the outcome.
      const onSigint = (): void => {};
      // SIGTERM/SIGHUP sent to the wrapper pid alone are relayed to Trivy.
      const relayedSignals: readonly NodeJS.Signals[] = ['SIGTERM', 'SIGHUP'];
      const relayHandlers = new Map<NodeJS.Signals, () => void>();

      process.on('SIGINT', onSigint);
      for (const signal of relayedSignals) {
        const handler = (): void => {
          child.kill(signal);
        };
        relayHandlers.set(signal, handler);
        process.on(signal, handler);
      }
      const detachSignalHandlers = (): void => {
        process.removeListener('SIGINT', onSigint);
        for (const [signal, handler] of relayHandlers) {
          process.removeListener(signal, handler);
        }
      };

      child.once('error', (cause) => {
        detachSignalHandlers();
        rejectPromise(new ProcessSpawnError(binaryPath, cause));
      });
      child.once('close', (code, signal) => {
        detachSignalHandlers();
        if (signal !== null) {
          // Die the same way the child died so the parent shell sees the
          // exact signal; the fallback below only runs if we survive it.
          process.kill(process.pid, signal);
          resolvePromise(TrivyRunner.conventionalExitCode(signal));
          return;
        }
        resolvePromise(code ?? 1);
      });
    });
  }

  /** POSIX convention: processes killed by signal N exit with 128 + N. */
  private static conventionalExitCode(signal: NodeJS.Signals): number {
    const signalNumber = osConstants.signals[signal];
    return typeof signalNumber === 'number' ? 128 + signalNumber : 1;
  }
}
