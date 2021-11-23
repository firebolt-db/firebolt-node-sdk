import { LoggerInterface, LoggerOptions } from "./logger";
import { HttpClientInterface, HttpClientOptions } from "./http";

export type Options = {
  loggerOptions?: LoggerOptions;
  clientOptions?: HttpClientOptions;
  dependencies?: {
    logger: LoggerInterface;
    httpClient: HttpClientInterface;
  };
};
