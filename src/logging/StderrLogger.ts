import type { Logger } from './Logger.js';

/**
 * Logger that writes exclusively to STDERR.
 *
 * STDOUT is reserved for Trivy itself so that shell pipelines such as
 * `npx trivy-scan repo <url> -f json > result.json` receive pure scanner
 * output, untouched by the wrapper.
 */
export class StderrLogger implements Logger {
  private static readonly PREFIX = 'trivy-scan';

  private readonly output: NodeJS.WritableStream;

  public constructor(output: NodeJS.WritableStream = process.stderr) {
    this.output = output;
  }

  public info(message: string): void {
    this.writeLines(message, '');
  }

  public warn(message: string): void {
    this.writeLines(message, 'warning: ');
  }

  public error(message: string): void {
    this.writeLines(message, 'error: ');
  }

  private writeLines(message: string, label: string): void {
    const rendered = message
      .split('\n')
      .map((line, index) => `${StderrLogger.PREFIX}: ${index === 0 ? label : ''}${line}`)
      .join('\n');
    this.output.write(`${rendered}\n`);
  }
}
