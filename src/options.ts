import { LoggerInterface, LoggerOptions } from "./logger";
import { HttpClientInterface, HttpClientOptions } from "./http";

export type Options = {
  logger?: LoggerOptions;
  client?: HttpClientOptions;
  apiEndpoint?: string;
  dependencies?: {
    logger: LoggerInterface;
    httpClient: HttpClientInterface;
  };
};
