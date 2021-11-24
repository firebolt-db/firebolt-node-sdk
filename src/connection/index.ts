import { Context } from "../context";
import { Parameter } from "../paramter";

export type ConnectionOptions = {
  api_url: string;
  username: string;
  password: string;
  database: string;
  engineName?: string;
  engineUrl?: string;
};

type QuerySettings = {
  output_format?: "FB_JSONCompactLimited" | "FB_JSONCompact";
};

type ExecuteQueryOptions = {
  settings?: QuerySettings;
  paramters?: Parameter[];
};

const defaultQuerySettings = {
  output_format: "FB_JSONCompactLimited"
};

export class Connection {
  context: Context;
  options: ConnectionOptions;

  constructor(context: Context, options: ConnectionOptions) {
    this.context = context;
    this.options = options;
  }

  async resolveEngineDomain() {
    const { resourceManager } = this.context;
    const { engineName, engineUrl } = this.options;
    if (engineUrl) {
      return engineUrl;
    }
    if (engineName) {
      try {
        const engine = await resourceManager.engine.getByName(engineName);
        return "";
      } catch (error) {
        throw new Error("unable to retrieve engine endpoint: ${error}");
      }
    }
    throw new Error("engineName or engineUrl should be provided");
  }

  async getRequestPath(settings: QuerySettings) {
    const { database } = this.options;
    const querySettings = { ...defaultQuerySettings, ...settings };
    const queryParams = new URLSearchParams({ database, ...querySettings });
    const engineDomain = await this.resolveEngineDomain();
    return `https://${engineDomain}?${queryParams}`;
  }

  getRequestBody(query: string) {
    return query.replace(/;\s*$/, "").trim();
  }

  async execute(query: string, executeQueryOptions: ExecuteQueryOptions = {}) {
    const { httpClient } = this.context;
    const { settings = {} } = executeQueryOptions;
    const body = this.getRequestBody(query);
    const path = await this.getRequestPath(settings);
    const response = await httpClient.request("POST", path, { body });
    const rows = await response.json();
    return rows;
  }
}
