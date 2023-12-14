import { LoggerInterface } from "../logger";
import { DatabaseServiceInterface } from "./database/types";
import { DatabaseService as DatabaseServiceV2 } from "./database";
import { DatabaseService as DatabaseServiceV1} from "./database/v1";
import { EngineServiceInterface } from "./engine/types";
import { EngineService as EngineServiceV2 } from "./engine";
import { EngineService as EngineServiceV1} from "./engine/v1";
import { ResourceManagerContext } from "../types";

export class ResourceManager {
  private context: ResourceManagerContext;
  accountName!: string;
  engine?: EngineServiceInterface;
  database?: DatabaseServiceInterface;

  constructor(context: ResourceManagerContext) {
    this.context = context;
  }

  async initialize() {
    const { httpClient, connection } = this.context;
    const accountId = await connection.resolveAccountId();
    if (httpClient.authenticator.isServiceAccount()) {
      this.engine = new EngineServiceV2(this.context);
      this.database = new DatabaseServiceV2(this.context);
    }
    if (httpClient.authenticator.isUsernamePassword()) {
      this.engine = new EngineServiceV1(this.context, accountId);
      this.database = new DatabaseServiceV1(this.context, accountId);
    }
  }
}
