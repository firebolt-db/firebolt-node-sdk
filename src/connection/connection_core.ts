import { Response } from "node-fetch";
import { Connection as BaseConnection } from "./base";
import { ExecuteQueryOptions, OutputFormat } from "../types";
import { AsyncStatement } from "../statement/async";
import { StreamStatement } from "../statement/stream";

export class ConnectionCore extends BaseConnection {
  async resolveEngineEndpoint(): Promise<string> {
    if (!this.options.engineEndpoint) {
      throw new Error("engineEndpoint is required for Firebolt Core connections");
    }
    this.engineEndpoint = this.options.engineEndpoint;
    return this.engineEndpoint;
  }

  async testConnection(): Promise<void> {
    await this.execute("SELECT 1");
  }

  async executeAsync(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<AsyncStatement> {
    throw new Error("Async queries are not supported in Firebolt Core");
  }

  async executeStream(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<StreamStatement> {
    const { response } = await this.prepareAndExecuteQuery(
      query,
      {
        ...executeQueryOptions,
        settings: {
          ...executeQueryOptions?.settings,
          output_format: OutputFormat.JSON_LINES
        }
      },
      true
    );

    return new StreamStatement({
      response,
      executeQueryOptions
    });
  }

  async isAsyncQueryRunning(token: string): Promise<boolean> {
    throw new Error("Async queries are not supported in Firebolt Core");
  }

  async isAsyncQuerySuccessful(token: string): Promise<boolean | undefined> {
    throw new Error("Async queries are not supported in Firebolt Core");
  }

  async cancelAsyncQuery(token: string): Promise<void> {
    throw new Error("Async queries are not supported in Firebolt Core");
  }

  async begin(): Promise<void> {
    throw new Error("Transactions are not supported in Firebolt Core");
  }

  async commit(): Promise<void> {
    throw new Error("Transactions are not supported in Firebolt Core");
  }

  async rollback(): Promise<void> {
    throw new Error("Transactions are not supported in Firebolt Core");
  }
}

