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
 *
 * Vulnerability DB repository defaults: Trivy's built-in order pulls from
 * `mirror.gcr.io` first, but that mirror returns 404 for the DB artifact in
 * many environments (and Trivy only falls back to other registries on 429/5xx,
 * NOT on 404 — so a 404 is fatal). To keep `npx @b2bc-devkit/trivy-scan`
 * working out of the box, the wrapper injects sensible `TRIVY_DB_REPOSITORY`
 * / `TRIVY_JAVA_DB_REPOSITORY` defaults pointing at GHCR (primary) and AWS ECR
 * Public (fallback for 429/5xx). Both are overridable: if the caller already
 * set either variable, the wrapper leaves it untouched.
 *
 * Refs:
 *  - https://github.com/aquasecurity/trivy/blob/main/docs/guide/configuration/db.md
 *  - https://github.com/aquasecurity/trivy/issues/7605 (fallback only on 429/5xx)
 */
export class TrivyRunner {
  /** Default vulnerability DB repositories (GHCR first, ECR Public fallback). */
  public static readonly DEFAULT_DB_REPOSITORY =
    'ghcr.io/aquasecurity/trivy-db:2,public.ecr.aws/aquasecurity/trivy-db:2';
  /** Default Java DB repositories (GHCR first, ECR Public fallback). */
  public static readonly DEFAULT_JAVA_DB_REPOSITORY =
    'ghcr.io/aquasecurity/trivy-java-db:1,public.ecr.aws/aquasecurity/trivy-java-db:1';

  public run(binaryPath: string, args: readonly string[]): Promise<number> {
    return new Promise<number>((resolvePromise, rejectPromise) => {
      const child = spawn(binaryPath, args, {
        stdio: 'inherit',
        env: TrivyRunner.childEnv(),
      });

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

  /**
   * Builds the child process environment, inheriting `process.env` and adding
   * DB repository defaults only when the caller has not already set them.
   */
  private static childEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (!env['TRIVY_DB_REPOSITORY']) {
      env['TRIVY_DB_REPOSITORY'] = TrivyRunner.DEFAULT_DB_REPOSITORY;
    }
    if (!env['TRIVY_JAVA_DB_REPOSITORY']) {
      env['TRIVY_JAVA_DB_REPOSITORY'] = TrivyRunner.DEFAULT_JAVA_DB_REPOSITORY;
    }
    return env;
  }
}
