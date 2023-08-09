import { ConnectionError, DeprecationError } from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { DatabaseModel } from "../database/model";
import { EngineModel } from "./model";
import { EngineStatusSummary, EngineType, WarmupMethod } from "./types";

export class EngineService {
  context: ResourceManagerContext;

  private CREATE_PARAMETER_NAMES: string[] = [
    "REGION",
    "ENGINE_TYPE",
    "SPEC",
    "SCALE",
    "AUTO_STOP",
    "WARMUP"
  ];

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

  async getByDB(database_name: string): Promise<EngineModel[]> {
    const engines: EngineModel[] = [];

    const query =
      "SELECT engine_name, url, status FROM information_schema.engines" +
      `WHERE attached_to = ${database_name}`;
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

  async create(
    name: string,
    region: string | undefined = undefined,
    engine_type: string | EngineType = EngineType.GENERAL_PURPOSE,
    spec: string | undefined = undefined,
    scale: number | undefined = undefined,
    auto_stop: number | undefined = undefined,
    warmup: string | WarmupMethod | undefined = undefined,
    fail_if_exists: boolean = true
  ): Promise<EngineModel> {
    let query: string =
      "CREATE ENGINE " + (fail_if_exists ? "" : "IF NOT EXISTS ") + name;

    const allParamValues = [
      region,
      engine_type,
      spec,
      scale,
      auto_stop,
      warmup
    ];
    const queryParameters: string[] = [];
    if (region || engine_type || spec || scale || auto_stop || warmup) {
      query += " WITH ";
      for (const [index, value] of allParamValues.entries()) {
        if (value) {
          query += `${this.CREATE_PARAMETER_NAMES[index]} = ?`;
          queryParameters.push(value.toString());
        }
      }
    }
    await this.context.connection.execute(query, {
      parameters: queryParameters
    });
    return await this.getByName(name);
  }

  async attach_to_database(
    engine: EngineModel | string,
    database: DatabaseModel | string
  ) {
    const engine_name = engine instanceof EngineModel ? engine.name : engine;
    const database_name =
      database instanceof DatabaseModel ? database.name : database;
    const query = `ATTACH ENGINE ${engine_name} TO ${database_name}`;
    await this.context.connection.execute(query);
  }
}
