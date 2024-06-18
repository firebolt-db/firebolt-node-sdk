import { ConnectionError, DeprecationError } from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { DatabaseModel } from "../database/model";
import { EngineModel } from "./model";
import {
  EngineStatusSummary,
  CreateEngineOptions,
  processEngineStatus
} from "./types";

export class EngineService {
  context: ResourceManagerContext;

  private CREATE_PARAMETER_NAMES: Record<string, string> = {
    spec: "TYPE",
    scale: "NODES",
    auto_stop: "AUTO_STOP",
    initially_stopped: "INITIALLY_STOPPED"
  };

  private INTERNAL_OPTIONS: Record<string, string> = {
    FB_INTERNAL_OPTIONS_ENGINE_VERSION: "VERSION"
  };

  constructor(context: ResourceManagerContext) {
    this.context = context;
  }

  private parseStatusForEngine(
    value: string,
    name: string
  ): EngineStatusSummary {
    const status = processEngineStatus(value);
    if (status === undefined) {
      throw new Error(`Engine ${name} has an unexpected status ${value}`);
    }
    return status;
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
      current_status_summary: this.parseStatusForEngine(status, name)
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
          current_status_summary: this.parseStatusForEngine(summary, name)
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
          current_status_summary: this.parseStatusForEngine(summary, name)
        })
      );
    }

    return engines;
  }

  private validateCreateOptions(options: CreateEngineOptions) {
    const disallowedOptions = ["region", "engine_type", "warmup"];
    // find a list of disallowed options that are set and report them in an exception
    const filteredOptions = disallowedOptions.filter(
      option => (options as Record<string, string>)[option] !== undefined
    );
    if (filteredOptions.length > 0) {
      throw new DeprecationError({
        message: `The following engine options are not supported for this account: ${filteredOptions.join(
          ", "
        )}`
      });
    }
  }

  private setDefaultCreateOptions(options: CreateEngineOptions) {
    if (options.fail_if_exists == undefined) {
      options.fail_if_exists = true;
    }
  }

  private getInternalOptions() {
    const internalOptions: Record<string, string> = {};
    for (const [env, optionName] of Object.entries(this.INTERNAL_OPTIONS)) {
      const optionValue = process.env[env];
      if (optionValue) {
        internalOptions[optionName] = optionValue;
        console.log(`Setting internal option ${optionName} to ${optionValue}`);
      }
    }
    return internalOptions;
  }

  async create(
    name: string,
    options: CreateEngineOptions = {}
  ): Promise<EngineModel> {
    this.validateCreateOptions(options);
    this.setDefaultCreateOptions(options);

    const { fail_if_exists, ...createOptions } = options;

    let query = `CREATE ENGINE ${
      fail_if_exists ? "" : "IF NOT EXISTS "
    } "${name}"`;

    const queryParameters: (string | number | boolean)[] = [];

    const internalOptions = this.getInternalOptions();

    // Exlude options that are not set or not allowed
    const filteredCreateOptions = Object.fromEntries(
      Object.entries(createOptions).filter(
        ([key, value]) =>
          value !== undefined &&
          value !== "" &&
          key in this.CREATE_PARAMETER_NAMES
      )
    );

    if (Object.keys(filteredCreateOptions).length > 0 || internalOptions) {
      query += " WITH ";
    }

    for (const [key, value] of Object.entries(filteredCreateOptions)) {
      if (key == "spec") {
        // spec value is provided raw without quotes
        query += `${this.CREATE_PARAMETER_NAMES[key]} = ${value} `;
      } else {
        query += `${this.CREATE_PARAMETER_NAMES[key]} = ? `;
        queryParameters.push(value);
      }
    }

    for (const [key, value] of Object.entries(internalOptions)) {
      query += `${key} = ? `;
      queryParameters.push(value);
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
    const query = `ALTER ENGINE "${engine_name}" SET DEFAULT_DATABASE="${database_name}"`;
    await this.context.connection.execute(query);
  }
}
