import { ConnectionError, DeprecationError } from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { EngineModel } from "../engine/model";
import { DatabaseModel } from "./model";
import { CreateDatabaseOptions } from "./types";

export class DatabaseService {
  context: ResourceManagerContext;

  constructor(context: ResourceManagerContext) {
    this.context = context;
  }

  async getDefaultEndpointByName(name: string): Promise<string> {
    throw new DeprecationError({
      message: "Default engines are no longer supported"
    });
  }

  async getById(databaseId: string): Promise<DatabaseModel> {
    throw new DeprecationError({
      message: "Can't call getById as database IDs are deprecated"
    });
  }

  async getByName(databaseName: string): Promise<DatabaseModel> {
    const query =
      "SELECT database_name, description FROM information_schema.databases " +
      `WHERE database_name='${databaseName}'`;

    const statement = await this.context.connection.execute(query);
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new ConnectionError({
        message: `Database ${databaseName} not found or is not accessbile`
      });
    }
    const [name, description] = data[0] as string[];
    return new DatabaseModel({ name, description }, this.context);
  }

  async getAll(): Promise<DatabaseModel[]> {
    const databases: DatabaseModel[] = [];
    const query =
      "SELECT database_name, description FROM information_schema.databases";
    const statement = await this.context.connection.execute(query);
    const { data } = await statement.fetchResult();

    for (const row of data) {
      const [name, description] = row as string[];
      databases.push(new DatabaseModel({ name, description }, this.context));
    }

    return databases;
  }

  async create(
    name: string,
    options: CreateDatabaseOptions = {}
  ): Promise<DatabaseModel> {
    if (options.fail_if_exists == undefined) {
      options.fail_if_exists = true;
    }
    let query = `CREATE DATABASE ${
      options.fail_if_exists ? "" : "IF NOT EXISTS "
    } "${name}"`;

    const queryParameters = [];
    let attachedEnginesSql = "";
    if (
      Array.isArray(options.attached_engines) &&
      options.attached_engines.length > 0
    ) {
      const attachedEngines = options.attached_engines
        .map(engine =>
          engine instanceof EngineModel ? `"${engine.name}"` : `"${engine}"`
        )
        .join(" ");
      attachedEnginesSql = ` ATTACHED_ENGINES = (${attachedEngines})`;
    }
    if (options.region || options.description || attachedEnginesSql) {
      query += " WITH";
      if (options.region) {
        query += " REGION = ?";
        queryParameters.push(options.region);
      }
      if (options.description) {
        query += " DESCRIPTION = ?";
        queryParameters.push(options.description);
      }
      query += attachedEnginesSql;
    }
    await this.context.connection.execute(query, {
      parameters: queryParameters
    });
    return await this.getByName(name);
  }
}
