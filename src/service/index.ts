import { HttpClientInterface } from "../http";
import { LoggerInterface } from "../logger";
import { EngineService } from "./engine";
import { Context } from "../types";

export class ResourceManager {
  private context: Context;
  engine: EngineService;

  constructor(context: {
    httpClient: HttpClientInterface;
    logger: LoggerInterface;
    apiEndpoint: string;
  }) {
    this.context = {
      ...context,
      resourceManager: this
    };
    this.engine = new EngineService(this.context);
  }
}
