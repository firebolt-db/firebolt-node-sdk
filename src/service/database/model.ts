import { DeprecationError } from "../../common/errors";
import { Database } from "./types";
import { ResourceManager } from "../index";
import { ResourceManagerContext } from "../../types";
import { EngineModelInterface, EngineStatusSummary } from "../engine/types";

export class DatabaseModel {
  name: string;
  description: string;
  private context: ResourceManagerContext;

  constructor(database: Database, context: ResourceManagerContext) {
    const { name, description } = database;
    this.name = name;
    this.description = description;
    this.context = context;
  }

  async getDefaultEndpoint(): Promise<string> {
    throw new DeprecationError({
      message: "Default endpoint concept no longer exists for databases."
    });
  }

  async getAttachedEngines(): Promise<EngineModelInterface[]> {
    const resourceManager = new ResourceManager(this.context);
    return await resourceManager.engine.getByDB(this.name);
  }

  async delete() {
    const engines: EngineModelInterface[] = await this.getAttachedEngines();
    for (const engine of engines) {
      if (
        engine.current_status_summary == EngineStatusSummary.STARTING ||
        engine.current_status_summary == EngineStatusSummary.STOPPING
      ) {
        throw new Error(
          "Unable to call delete: Engine must not be in starting or stopping state."
        );
      }
    }
    const query = `DROP DATABASE "${this.name}"`;
    await this.context.connection.execute(query);
  }
}
