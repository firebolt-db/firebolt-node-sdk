import { Context } from "../context";
import { HttpClientInterface } from "../http";
import { LoggerInterface } from "../logger";
import { EngineService } from "./engine";

export class ResourceManager {
  context: Context;
  engine: EngineService;

  constructor(context: {
    httpClient: HttpClientInterface;
    logger: LoggerInterface;
  }) {
    this.context = {
      ...context,
      resourceManager: this
    };
    this.engine = new EngineService(this.context);
  }
}
