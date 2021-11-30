import { Context } from "../context";
import { ExecuteQueryOptions, OutputFormat } from "../types";
import { Statement } from "../statement";

export type ConnectionOptions = {
  username: string;
  password: string;
  database: string;
  engineName?: string;
  engineUrl?: string;
};

const defaultQuerySettings = {
  output_format: OutputFormat.JSON_COMPACT_LIMITED
};

const defaultResponseSettings = {
  normalizeData: true
};

export class Connection {
  private context: Context;
  private options: ConnectionOptions;

  constructor(context: Context, options: ConnectionOptions) {
    this.context = context;
    this.options = options;
  }

  private async resolveEngineDomain() {
    const { resourceManager } = this.context;
    const { engineName, engineUrl } = this.options;
    if (engineUrl) {
      return engineUrl;
    }
    if (engineName) {
      try {
        const engine = await resourceManager.engine.getByName(engineName);
        return engine.endpoint;
      } catch (error) {
        throw new Error(`unable to retrieve engine endpoint: ${error}`);
      }
    }
    throw new Error("engineName or engineUrl should be provided");
  }

  private async getRequestUrl(executeQueryOptions: ExecuteQueryOptions) {
    const { settings } = executeQueryOptions;
    const { database } = this.options;
    const queryParams = new URLSearchParams({ database, ...settings });
    const engineDomain = await this.resolveEngineDomain();
    return `${engineDomain}?${queryParams}`;
  }

  private getRequestBody(query: string) {
    return query.replace(/;\s*$/, "").trim();
  }

  async execute(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<Statement> {
    const { httpClient } = this.context;

    executeQueryOptions.settings = {
      ...defaultQuerySettings,
      ...(executeQueryOptions.settings || {})
    };

    executeQueryOptions.response = {
      ...defaultResponseSettings,
      ...(executeQueryOptions.response || {})
    };

    const body = this.getRequestBody(query);
    const url = await this.getRequestUrl(executeQueryOptions);

    const response: string = await httpClient.request<string>("POST", url, {
      body,
      text: true
    });

    const statement = new Statement(this.context, {
      query,
      response,
      executeQueryOptions
    });

    return statement;
  }
}
