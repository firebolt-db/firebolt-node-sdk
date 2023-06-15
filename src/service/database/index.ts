import {
  AuthenticationError,
  ConnectionError,
  DeprecationError
} from "../../common/errors";
import { Connection } from "../../connection";
import { Context } from "../../types";
import { DatabaseModel } from "./model";

export class DatabaseService {
  private context: Context;
  connection!: Connection;

  constructor(context: Context) {
    this.context = context;
  }

  private throwErrorIfNoConnection() {
    if (typeof this.connection == "undefined") {
      throw new AuthenticationError({
        message:
          "Can't execute a resource manager operation. Did you run authenticate()?"
      });
    }
  }

  private async getDatabaseId(databaseName: string) {
    throw new DeprecationError({
      message: "Can't call getDatabaseId as database IDs are deprecated"
    });
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
    this.throwErrorIfNoConnection();
    // TODO: not sure how useful this is currently?
    const query =
      "SELECT database_name FROM information_schema.databases " +
      `WHERE database_name='${databaseName}'`;

    const statement = await this.connection.execute(query);
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new ConnectionError({
        message: `Database ${databaseName} not found or is not accessbile`
      });
    }
    const firstRow = data[0] as unknown[];
    const database = {
      name: firstRow[0] as string
    };
    return new DatabaseModel(this.context, database);
  }

  async getAll(): Promise<DatabaseModel[]> {
    this.throwErrorIfNoConnection();
    const databases: DatabaseModel[] = [];
    const query = "SELECT database_name FROM information_schema.databases";
    const statement = await this.connection.execute(query);
    const { data } = await statement.streamResult();

    // TODO: getting ABORT_ERR here?
    data.on("error", error => {
      console.log(error);
    });

    for await (const row of data) {
      const database = {
        name: row[0] as string
      };
      databases.push(new DatabaseModel(this.context, database));
    }

    return databases;
  }
}
