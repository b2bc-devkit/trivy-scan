/** Minimal logging abstraction so components never write to stdio directly. */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
