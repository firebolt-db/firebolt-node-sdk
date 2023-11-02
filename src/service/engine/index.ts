import { ConnectionError, DeprecationError } from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { DatabaseModel } from "../database/model";
import { EngineModel } from "./model";
import { EngineStatusSummary, CreateEngineOptions, EngineType } from "./types";

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
      "SELECT engine_name, url, status FROM information_schema.engines " +
      `WHERE attached_to = '${database_name}'`;
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
    options: CreateEngineOptions = {}
  ): Promise<EngineModel> {
    if (options.fail_if_exists == undefined) {
      options.fail_if_exists = true;
    }
    if (options.engine_type == undefined) {
      options.engine_type = EngineType.GENERAL_PURPOSE;
    }
    let query = `CREATE ENGINE ${
      options.fail_if_exists ? "" : "IF NOT EXISTS "
    } "${name}"`;

    const allParamValues = [
      options.region,
      options.engine_type,
      options.spec,
      options.scale,
      options.auto_stop,
      options.warmup
    ];
    const queryParameters: (string | number)[] = [];
    if (
      options.region ||
      options.engine_type ||
      options.spec ||
      options.scale ||
      options.auto_stop ||
      options.warmup
    ) {
      query += " WITH ";
      for (const [index, value] of allParamValues.entries()) {
        if (value) {
          query += `${this.CREATE_PARAMETER_NAMES[index]} = ?`;
          queryParameters.push(value);
        }
      }
    }
    await this.context.connection.execute(query, {
      parameters: queryParameters
    });
    return await this.getByName(name);
  }

  async attachToDatabase(
    engine: EngineModel | string,
    database: DatabaseModel | string
  ) {
    const engine_name = engine instanceof EngineModel ? engine.name : engine;
    const database_name =
      database instanceof DatabaseModel ? database.name : database;
    const query = `ATTACH ENGINE "${engine_name}" TO "${database_name}"`;
    await this.context.connection.execute(query);
  }
}
