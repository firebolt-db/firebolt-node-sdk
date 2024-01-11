import { DatabaseServiceInterface } from "./database/types";
import { DatabaseService as DatabaseServiceV2 } from "./database";
import { DatabaseService as DatabaseServiceV1 } from "./database/v1";
import { EngineServiceInterface } from "./engine/types";
import { EngineService as EngineServiceV2 } from "./engine";
import { EngineService as EngineServiceV1 } from "./engine/v1";
import { ResourceManagerContext } from "../types";

export class ResourceManager {
  private context: ResourceManagerContext;
  engine: EngineServiceInterface;
  database: DatabaseServiceInterface;

  constructor(context: ResourceManagerContext) {
    this.context = context;
    const { httpClient } = this.context;
    if (httpClient.authenticator.isServiceAccount()) {
      this.engine = new EngineServiceV2(this.context);
      this.database = new DatabaseServiceV2(this.context);
    } else if (httpClient.authenticator.isUsernamePassword()) {
      this.engine = new EngineServiceV1(this.context);
      this.database = new DatabaseServiceV1(this.context);
    } else {
      throw new Error(
        "Invalid auth credentials provided. Please check your credentials and try again."
      );
    }
  }
}
