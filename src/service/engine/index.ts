import {
  AuthenticationError,
  ConnectionError,
  DeprecationError
} from "../../common/errors";
import { Connection } from "../../connection";
import { Context } from "../../types";
import { EngineModel } from "./model";
import { EngineStatusSummary } from "./types";

export class EngineService {
  private context: Context;
  connection!: Connection;

  constructor(context: Context) {
    this.context = context;
  }

  async getById(engineId: string) {
    throw new DeprecationError({
      message: "Can't call getById as engine IDs are deprecated"
    });
  }

  private throwErrorIfNoConnection() {
    if (typeof this.connection == "undefined") {
      throw new AuthenticationError({
        message:
          "Can't execute a resource manager operation. Did you run authenticate()?"
      });
    }
  }

  async getByName(engineName: string): Promise<EngineModel> {
    this.throwErrorIfNoConnection();
    const query =
      "SELECT engine_name, url, status FROM information_schema.engines " +
      `WHERE engine_name='${engineName}'`;
    const statement = await this.connection.execute(query);
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new ConnectionError({
        message: `Engine ${engineName} not found or is not accessbile`
      });
    }
    const firstRow = data[0] as unknown[];
    const status: EngineStatusSummary = firstRow[2] as EngineStatusSummary;
    const engine = {
      name: firstRow[0] as string,
      endpoint: firstRow[1] as string,
      current_status_summary: status
    };
    return new EngineModel(this.context, this.connection, engine);
  }

  async getAll(): Promise<EngineModel[]> {
    this.throwErrorIfNoConnection();
    const engines: EngineModel[] = [];

    const query =
      "SELECT engine_name, url, status FROM information_schema.engines";
    const statement = await this.connection.execute(query);
    const { data } = await statement.streamResult();

    data.on("error", error => {
      console.log(error);
    });

    for await (const row of data) {
      const [name, endpoint, summary] = row as string[];
      engines.push(
        new EngineModel(this.context, this.connection, {
          name,
          endpoint,
          current_status_summary: summary as EngineStatusSummary
        })
      );
    }

    return engines;
  }
}
