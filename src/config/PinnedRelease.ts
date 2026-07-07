// ============================================================================
// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
//
// Regenerate with:  npm run update-pinned [-- v<X.Y.Z>]
//
// The checksums below are copied verbatim from the official release manifest
// (trivy_0.72.0_checksums.txt) published by aquasecurity/trivy on GitHub.
// ============================================================================

/**
 * The Trivy release this package is pinned to, together with the SHA-256
 * checksum of every supported release artifact.
 *
 * The pinned release serves as the offline-safe fallback whenever the latest
 * version cannot (or must not) be resolved over the network, and its baked-in
 * checksums allow artifact verification without trusting any live endpoint.
 */
export class PinnedRelease {
  /** Pinned Trivy version (without the "v" prefix). */
  public static readonly VERSION = '0.72.0';

  /** SHA-256 checksums of the supported artifacts, keyed by artifact file name. */
  private static readonly CHECKSUMS: Readonly<Record<string, string>> = {
    'trivy_0.72.0_Linux-64bit.tar.gz': 'bbb64b9695866ce4a7a8f5c9592002c5961cab378577fa3f8a040df362b9b2ea',
    'trivy_0.72.0_Linux-ARM.tar.gz': 'b54b629ee03e6e894a0f652c8e07718a86610ca291f75453701d81a4cc277a8b',
    'trivy_0.72.0_Linux-ARM64.tar.gz': '2ca2c023109c2db6b2b77366b6717291452d4531167377d95c79547f0c8e3467',
    'trivy_0.72.0_Linux-PPC64LE.tar.gz': '4d88d67f21c0926815f504aa7c289b845dba5853020573834915eecdd49cc111',
    'trivy_0.72.0_Linux-s390x.tar.gz': '8831ccdc13b805e1456a961b7f855d9479cb3fe697ac975a5401d4895a25df97',
    'trivy_0.72.0_macOS-64bit.tar.gz': 'ee5e60df8a98e5b89fd74a6d86f9e5c7e9a266a35002cb1e43291698b3bfee08',
    'trivy_0.72.0_macOS-ARM64.tar.gz': '88f208680dc05da2b459e19b4f5aa2b4dc7c2117892ba4aab2ae63baba330016',
    'trivy_0.72.0_windows-64bit.zip': 'ed3cf122060f61818fe1f735fd97557954e16e10bc8b058af9852271cf2e91b3',
  };

  private constructor() {
    // Static holder class — never instantiated.
  }

  /** Returns the pinned checksum for the given artifact name, if known. */
  public static checksumFor(assetName: string): string | undefined {
    return Object.prototype.hasOwnProperty.call(PinnedRelease.CHECKSUMS, assetName)
      ? PinnedRelease.CHECKSUMS[assetName]
      : undefined;
  }

  /** All artifact names that have a pinned checksum. */
  public static assetNames(): readonly string[] {
    return Object.keys(PinnedRelease.CHECKSUMS);
  }
}
