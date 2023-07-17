import { ConnectionError, DeprecationError } from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { EngineModel } from "./model";
import { EngineStatusSummary } from "./types";

export class EngineService {
  context: ResourceManagerContext;

  constructor(context: ResourceManagerContext) {
    this.context = context;
  }

  async getById(engineId: string) {
    throw new DeprecationError({
      message: "Can't call getById as engine IDs are deprecated"
    });
  }

  async getByName(engineName: string): Promise<EngineModel> {
    const query =
      "SELECT engine_name, url, status FROM information_schema.engines " +
      `WHERE engine_name='${engineName}'`;
    const statement = await this.context.connection.execute(query);
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new ConnectionError({
        message: `Engine ${engineName} not found or is not accessbile`
      });
    }
    const [name, endpoint, status] = data[0] as string[];
    return new EngineModel(this.context.connection, {
      name,
      endpoint,
      current_status_summary: status as EngineStatusSummary
    });
  }

  async getAll(): Promise<EngineModel[]> {
    const engines: EngineModel[] = [];

    const query =
      "SELECT engine_name, url, status FROM information_schema.engines";
    const statement = await this.context.connection.execute(query);
    const { data } = await statement.fetchResult();

    for (const row of data) {
      const [name, endpoint, summary] = row as string[];
      engines.push(
        new EngineModel(this.context.connection, {
          name,
          endpoint,
          current_status_summary: summary as EngineStatusSummary
        })
      );
    }

    return engines;
  }
}
