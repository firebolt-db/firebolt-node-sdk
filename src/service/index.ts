import { LoggerInterface } from "../logger";
import { DatabaseService } from "./database";
import { EngineService } from "./engine";
import { AccountService } from "./account";
import { ResourceManagerContext } from "../types";
import { Connection } from "../connection";

export class ResourceManager {
  private context: ResourceManagerContext;
  accountName!: string;
  engine: EngineService;
  database: DatabaseService;
  account: AccountService;

  constructor(context: { logger: LoggerInterface; connection: Connection }) {
    this.context = context;
    this.engine = new EngineService(this.context);
    this.database = new DatabaseService(this.context);
    this.account = new AccountService(this.context);
  }
}
