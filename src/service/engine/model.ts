import { ConnectionError, DeprecationError } from "../../common/errors";
import { Connection } from "../../connection";
import { Engine, EngineStatusSummary, processEngineStatus } from "./types";

export class EngineModel {
  name: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;
  private connection: Connection;

  constructor(connection: Connection, engine: Engine) {
    const { name, endpoint, current_status_summary } = engine;
    this.name = name;
    this.endpoint = endpoint;
    this.connection = connection;
    this.current_status_summary = current_status_summary;
  }

  async start() {
    const query = `START ENGINE ${this.name}`;
    await this.connection.execute(query);
    await this.refreshStatus();
    const res: Engine = {
      name: this.name,
      endpoint: this.endpoint,
      current_status_summary: this.current_status_summary
    };
    return { engine: res };
  }

  async startAndWait() {
    // START ENGINE is now blocking
    return this.start();
  }

  async stop() {
    const query = `STOP ENGINE ${this.name}`;
    await this.connection.execute(query);
    await this.refreshStatus();
    const res: Engine = {
      name: this.name,
      endpoint: this.endpoint,
      current_status_summary: this.current_status_summary
    };
    return { engine: res };
  }

  async restart() {
    throw new DeprecationError({
      message: "Restart engine is no longer programmatically supported"
    });
  }

  async delete() {
    await this.refreshStatus();
    if (this.current_status_summary == EngineStatusSummary.DELETING) {
      return;
    }
    const query = `DROP ENGINE "${this.name}"`;
    await this.connection.execute(query);
  }

  private async refreshStatus() {
    const query =
      "SELECT status FROM information_schema.engines " +
      `WHERE engine_name='${this.name}'`;
    const statement = await this.connection.execute(query);
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new ConnectionError({
        message: `Engine ${this.name} not found or is not accessbile`
      });
    }
    const firstRow = data[0] as unknown[];
    const status = processEngineStatus(firstRow[0] as string);
    if (!status) {
      throw new Error(
        `Engine ${this.name} has an unexpected status ${firstRow[0]}`
      );
    }
    this.current_status_summary = status;
  }
}
