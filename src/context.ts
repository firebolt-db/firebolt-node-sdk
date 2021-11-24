import { HttpClientInterface } from "./http";
import { LoggerInterface } from "./logger";
import { ResourceManager } from "./service";

export type Context = {
  logger: LoggerInterface;
  httpClient: HttpClientInterface;
  resourceManager: ResourceManager;
};
