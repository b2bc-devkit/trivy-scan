/**
 * Public programmatic API of the trivy-scan wrapper.
 *
 * Example:
 *   import { CliApplication, StderrLogger } from 'trivy-scan';
 *   const app = CliApplication.assemble(new StderrLogger());
 *   const exitCode = await app.run(['fs', '.', '--severity', 'HIGH,CRITICAL']);
 */
export { CliApplication } from './CliApplication.js';
export { TrivyInstaller } from './installer/TrivyInstaller.js';
export { TrivyRunner } from './runner/TrivyRunner.js';
export { PinnedRelease } from './config/PinnedRelease.js';
export { EnvironmentConfiguration } from './config/EnvironmentConfiguration.js';
export type { Configuration } from './config/Configuration.js';
export { VersionSpec } from './config/VersionSpec.js';
export { TrivyReleaseUrls } from './config/TrivyReleaseUrls.js';
export { TrivyVersion } from './domain/TrivyVersion.js';
export { PlatformTarget } from './domain/PlatformTarget.js';
export { Sha256Digest } from './domain/Sha256Digest.js';
export { ArchiveFormat } from './domain/ArchiveFormat.js';
export { NodePlatformResolver } from './platform/NodePlatformResolver.js';
export type { PlatformResolver } from './platform/PlatformResolver.js';
export type { Logger } from './logging/Logger.js';
export { StderrLogger } from './logging/StderrLogger.js';
export { TrivyScanError } from './errors/TrivyScanError.js';
export { ConfigurationError } from './errors/ConfigurationError.js';
export { UnsupportedPlatformError } from './errors/UnsupportedPlatformError.js';
export { VersionResolutionError } from './errors/VersionResolutionError.js';
export { DownloadError } from './errors/DownloadError.js';
export { ChecksumMismatchError } from './errors/ChecksumMismatchError.js';
export { ChecksumUnavailableError } from './errors/ChecksumUnavailableError.js';
export { ExtractionError } from './errors/ExtractionError.js';
export { ProcessSpawnError } from './errors/ProcessSpawnError.js';
