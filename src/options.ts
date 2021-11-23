import { LoggerInterface, LoggerOptions } from "./logger";
import { HttpClientInterface, HttpClientOptions } from "./http";

export type Options = {
  loggerOptions?: LoggerOptions;
  clientOptions?: HttpClientOptions;
  depencencies?: {
    logger: LoggerInterface;
    httpClient: HttpClientInterface;
  };
};
