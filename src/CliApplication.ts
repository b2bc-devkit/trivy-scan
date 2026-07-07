import { ArchiveExtractorFactory } from './archive/ArchiveExtractorFactory.js';
import { CacheDirectoryLocator } from './cache/CacheDirectoryLocator.js';
import { EnvironmentConfiguration } from './config/EnvironmentConfiguration.js';
import { TrivyScanError } from './errors/TrivyScanError.js';
import { TrivyInstaller } from './installer/TrivyInstaller.js';
import type { Logger } from './logging/Logger.js';
import { StderrLogger } from './logging/StderrLogger.js';
import { HttpsHttpClient } from './net/HttpsHttpClient.js';
import { NodePlatformResolver } from './platform/NodePlatformResolver.js';
import { TrivyRunner } from './runner/TrivyRunner.js';
import { ChecksumVerifier } from './security/ChecksumVerifier.js';
import { CompositeChecksumProvider } from './security/CompositeChecksumProvider.js';
import { PinnedChecksumProvider } from './security/PinnedChecksumProvider.js';
import { RemoteChecksumProvider } from './security/RemoteChecksumProvider.js';
import { Sha256FileHasher } from './security/Sha256FileHasher.js';
import { LatestVersionResolver } from './version/LatestVersionResolver.js';
import { VersionCheckCache } from './version/VersionCheckCache.js';
import { VersionResolutionService } from './version/VersionResolutionService.js';

/**
 * Composition root and entry point of the CLI.
 *
 * Wires the object graph by hand (constructor injection everywhere) and
 * translates failures into the process exit code. All wrapper diagnostics go
 * to STDERR; STDOUT belongs exclusively to Trivy.
 */
export class CliApplication {
  private readonly installer: TrivyInstaller;
  private readonly runner: TrivyRunner;

  public constructor(installer: TrivyInstaller, runner: TrivyRunner) {
    this.installer = installer;
    this.runner = runner;
  }

  /** Java-style program entry: `CliApplication.main(process.argv.slice(2))`. */
  public static async main(rawArgs: readonly string[]): Promise<void> {
    const logger = new StderrLogger();
    try {
      const application = CliApplication.assemble(logger);
      process.exitCode = await application.run(rawArgs);
    } catch (cause) {
      if (cause instanceof TrivyScanError) {
        logger.error(cause.message);
      } else {
        logger.error(`unexpected error: ${cause instanceof Error ? (cause.stack ?? cause.message) : String(cause)}`);
      }
      process.exitCode = 1;
    }
  }

  /** Builds the production object graph. */
  public static assemble(logger: Logger): CliApplication {
    const configuration = EnvironmentConfiguration.fromProcessEnv();
    const cacheLocator = new CacheDirectoryLocator(configuration);
    const httpClient = new HttpsHttpClient();

    const versionCheckCache = new VersionCheckCache(cacheLocator.versionCheckFilePath());
    const latestVersionResolver = new LatestVersionResolver(httpClient, versionCheckCache, logger);
    const versionResolver = new VersionResolutionService(configuration, latestVersionResolver, logger);

    const checksumProvider = new CompositeChecksumProvider(
      new PinnedChecksumProvider(),
      new RemoteChecksumProvider(httpClient, cacheLocator),
    );

    const installer = new TrivyInstaller(
      new NodePlatformResolver(),
      versionResolver,
      checksumProvider,
      new ChecksumVerifier(new Sha256FileHasher()),
      new ArchiveExtractorFactory(),
      cacheLocator,
      httpClient,
      logger,
    );
    return new CliApplication(installer, new TrivyRunner());
  }

  /**
   * Ensures the binary is installed, then hands over to Trivy with the raw,
   * unmodified argument array and returns Trivy's exit code.
   */
  public async run(args: readonly string[]): Promise<number> {
    const binaryPath = await this.installer.ensureInstalled();
    return this.runner.run(binaryPath, args);
  }
}
