export type LoggerOptions = Record<string, unknown>;

export interface LoggerInterface {
  log(message: string): void;
}

export type Logger = {
  new (loggerOptions?: LoggerOptions): LoggerInterface;
};
