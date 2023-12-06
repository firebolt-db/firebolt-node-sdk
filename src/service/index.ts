import { LoggerInterface } from "../logger";
import { DatabaseService } from "./database";
import { EngineService } from "./engine";
import { ResourceManagerContext } from "../types";
import { Connection } from "../connection";

export class ResourceManager {
  private context: ResourceManagerContext;
  accountName!: string;
  engine: EngineService;
  database: DatabaseService;

  constructor(context: { logger: LoggerInterface; connection: Connection }) {
    this.context = context;
    this.engine = new EngineService(this.context);
    this.database = new DatabaseService(this.context);
  }
}
