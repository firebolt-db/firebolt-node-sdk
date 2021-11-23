import { HttpClientInterface } from "./http";
import { LoggerInterface } from "./logger";

export type Context = {
  logger: LoggerInterface;
  httpClient: HttpClientInterface;
};
