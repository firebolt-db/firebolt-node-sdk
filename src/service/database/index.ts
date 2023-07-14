import { ConnectionError, DeprecationError } from "../../common/errors";
import { ResourceManagerContext } from "../../types";
import { DatabaseModel } from "./model";

export class DatabaseService {
  context: ResourceManagerContext;

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
    return new DatabaseModel({ name, description });
  }

  async getAll(): Promise<DatabaseModel[]> {
    const databases: DatabaseModel[] = [];
    const query =
      "SELECT database_name, description FROM information_schema.databases";
    const statement = await this.context.connection.execute(query);
    const { data } = await statement.fetchResult();

    for (const row of data) {
      const [name, description] = row as string[];
      databases.push(new DatabaseModel({ name, description }));
    }

    return databases;
  }
}
