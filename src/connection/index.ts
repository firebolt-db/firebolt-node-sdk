import { Context } from "../context";
import { Parameter } from "../paramter";
import { Authenticator } from "../auth";

export type ConnectionOptions = {
  api_url: string;
  username: string;
  password: string;
  database: string;
  engine: string;
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

const engineSuffix = "firebolt.us-east-1.dev.firebolt.io";

export class Connection {
  context: Context;
  options: ConnectionOptions;
  auth!: Authenticator;

  constructor(context: Context, options: ConnectionOptions) {
    this.context = context;
    this.options = options;
  }

  async connect() {
    const auth = new Authenticator(this.context, this.options);
    this.auth = auth;
    await auth.authenticate();
  }

  getRequestPath(settings: QuerySettings) {
    const { engine, database } = this.options;
    const querySettings = { ...defaultQuerySettings, ...settings };
    const queryParams = new URLSearchParams({ database, ...querySettings });
    return `https://${engine}.${engineSuffix}?${queryParams}`;
  }

  getRequestBody(query: string) {
    return query.replace(/;\s*$/, "").trim();
  }

  async execute(query: string, executeQueryOptions: ExecuteQueryOptions = {}) {
    const { httpClient } = this.context;
    const { settings = {} } = executeQueryOptions;
    const headers = this.auth.getRequestHeaders({});
    const body = this.getRequestBody(query);
    const path = this.getRequestPath(settings);
    const response = await httpClient.request("POST", path, { headers, body });
    const rows = await response.json();
    return rows;
  }
}
