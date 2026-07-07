/** Archive formats used by official Trivy release artifacts. */
export enum ArchiveFormat {
  /** Gzipped tarball — Linux, macOS and other Unix-like artifacts. */
  TAR_GZ = 'tar.gz',
  /** Zip archive — Windows artifacts. */
  ZIP = 'zip',
}
