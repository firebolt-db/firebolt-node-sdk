import { HttpClientInterface } from "../http";
import { LoggerInterface } from "../logger";
import { DatabaseService } from "./database";
import { EngineService } from "./engine";
import { Authenticator } from "../auth";
import { AuthOptions, Context } from "../types";

export class ResourceManager {
  private context: Context;
  engine: EngineService;
  database: DatabaseService;

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
    this.database = new DatabaseService(this.context);
  }

  async authenticate(options: AuthOptions) {
    const auth = new Authenticator(this.context, options);
    await auth.authenticate();
  }
}
