#!/usr/bin/env node
import { CliApplication } from '../CliApplication.js';

// Completely transparent passthrough: everything after `trivy-scan` reaches
// the Trivy binary verbatim via process.argv.slice(2) — no argument parsing,
// no reordering, no injected flags.
void CliApplication.main(process.argv.slice(2));
