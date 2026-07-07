import type { Logger } from '../../src/logging/Logger.js';

/** In-memory logger capturing messages for assertions. */
export class FakeLogger implements Logger {
  public readonly infoMessages: string[] = [];
  public readonly warnMessages: string[] = [];
  public readonly errorMessages: string[] = [];

  public info(message: string): void {
    this.infoMessages.push(message);
  }

  public warn(message: string): void {
    this.warnMessages.push(message);
  }

  public error(message: string): void {
    this.errorMessages.push(message);
  }
}
