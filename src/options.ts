import { LoggerInterface, LoggerOptions } from "./logger";
import { HttpClientInterface, HttpClientOptions } from "./http";

export type Options = {
  logger?: LoggerOptions;
  client?: HttpClientOptions;
  apiUrl?: string;
  dependencies?: {
    logger: LoggerInterface;
    httpClient: HttpClientInterface;
  };
};
