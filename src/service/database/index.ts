import {
  ApiError,
  CompositeError,
  ConnectionError,
  DeprecationError
} from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { DatabaseModel } from "./model";
import { CreateDatabaseOptions } from "./types";

export class DatabaseService {
  context: ResourceManagerContext;
  _catalogName: string | undefined;

  constructor(context: ResourceManagerContext) {
    this.context = context;
    this._catalogName = undefined;
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

  public async catalogName(): Promise<string> {
    if (!this._catalogName) {
      const query = "SELECT count(*) FROM information_schema.catalogs";
      try {
        const statement = await this.context.connection.execute(query);
      } catch (error) {
        if (error instanceof ApiError || error instanceof CompositeError) {
          this._catalogName = "database";
          return this._catalogName;
        }
        throw error;
      }
      this._catalogName = "catalog";
    }
    return this._catalogName;
  }

  async getByName(databaseName: string): Promise<DatabaseModel> {
    const catalogName = await this.catalogName();
    const query =
      `SELECT ${catalogName}_name, description FROM information_schema.${catalogName}s ` +
      `WHERE ${catalogName}_name='${databaseName}'`;

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
    const catalogName = await this.catalogName();
    const query = `SELECT ${catalogName}_name, description FROM information_schema.${catalogName}s`;
    const statement = await this.context.connection.execute(query);
    const { data } = await statement.fetchResult();

    for (const row of data) {
      const [name, description] = row as string[];
      databases.push(new DatabaseModel({ name, description }, this.context));
    }

    return databases;
  }

  private validateCreateOptions(options: CreateDatabaseOptions) {
    if (options.region) {
      throw new DeprecationError({
        message: "Region parameter is not supported for this account"
      });
    }
  }

  private setDefaultCreateOptions(options: CreateDatabaseOptions) {
    if (options.fail_if_exists == undefined) {
      options.fail_if_exists = true;
    }
  }

  async create(
    name: string,
    options: CreateDatabaseOptions = {}
  ): Promise<DatabaseModel> {
    this.validateCreateOptions(options);
    this.setDefaultCreateOptions(options);

    let query = `CREATE DATABASE ${
      options.fail_if_exists ? "" : "IF NOT EXISTS "
    } "${name}"`;

    const queryParameters = [];

    if (options.description) {
      query += " WITH DESCRIPTION = ?";
      queryParameters.push(options.description);
    }

    await this.context.connection.execute(query, {
      parameters: queryParameters
    });
    return await this.getByName(name);
  }
}
