import { ConnectionError, DeprecationError } from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { EngineModel } from "../engine/model";
import { DatabaseModel } from "./model";

export class DatabaseService {
  context: ResourceManagerContext;

  private CREATE_PARAMETER_NAMES: string[] = [
    "REGION",
    "ATTACHED_ENGINES",
    "DESCRIPTION"
  ];

  constructor(context: ResourceManagerContext) {
    this.context = context;
  }

  async getDefaultEndpointByName(name: string) {
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
    region: string | undefined = undefined,
    attached_engines: string[] | EngineModel[] | undefined = undefined,
    description: string | undefined = undefined,
    fail_if_exists: boolean = true
  ): Promise<DatabaseModel> {
    let query: string =
      "CREATE DATABASE " + (fail_if_exists ? "" : "IF NOT EXISTS ") + name;

    const allParamValues = [region, attached_engines, description];
    const queryParameters = [];
    if (region || attached_engines || description) {
      query += " WITH ";
      for (const [index, value] of allParamValues.entries()) {
        if (value) {
          query += `${this.CREATE_PARAMETER_NAMES[index]} = ?`;
          if (
            Array.isArray(value) &&
            value.length > 0 &&
            value[0] instanceof EngineModel
          ) {
            const engines: EngineModel[] = value as EngineModel[];
            const newValue: string[] = engines.map(
              (eng: EngineModel) => eng.name
            );
            queryParameters.push(newValue);
          } else {
            queryParameters.push(value);
          }
        }
      }
    }
    await this.context.connection.execute(query, {
      parameters: queryParameters
    });
    return await this.getByName(name);
  }
}
