import { DeprecationError } from "../../common/errors";
import { Database } from "./types";
import { ResourceManager } from "../../service"
import { ResourceManagerContext } from "../../types";
import { EngineModel } from "../engine/model";
import { EngineStatusSummary } from "../engine/types";

export class DatabaseModel {
  name: string;
  description: string;
  private resourceManager: ResourceManager;

  constructor(database: Database, context: ResourceManagerContext) {
    const { name, description } = database;
    this.name = name;
    this.description = description;
    this.resourceManager = new ResourceManager(context);
  }

  async getDefaultEndpoint(): Promise<string> {
    throw new DeprecationError({
      message: "Default endpoint concept no longer exists for databases."
    });
  }

  async get_attached_engines() : Promise<EngineModel[]> {
    return await this.resourceManager.engine.getByDB(this.name);
  }

  async delete() {
    const engines: EngineModel[] = await this.get_attached_engines();
    for (const engine of engines) {
      if (
        engine.current_status_summary != EngineStatusSummary.STARTING &&  
        engine.current_status_summary != EngineStatusSummary.STOPPING
      ) {
        throw new Error(
          "Unable to call delete: Engine must not be in starting or stopping state."
        );
      }
    }
    const query = `DROP DATABASE ${this.name}`;
    this.resourceManager.database.context.connection.execute(query);
  }
}
