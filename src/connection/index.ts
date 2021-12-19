import {
  ExecuteQueryOptions,
  ConnectionOptions,
  OutputFormat,
  Context
} from "../types";

import { Statement } from "../statement";

const defaultQuerySettings = {
  output_format: OutputFormat.JSON_COMPACT
};

const defaultResponseSettings = {
  normalizeData: false
};

export class Connection {
  private context: Context;
  private options: ConnectionOptions;
  engineEndpoint!: string;
  activeRequests = new Set<{ abort: () => void }>();

  constructor(context: Context, options: ConnectionOptions) {
    this.context = context;
    this.options = options;
  }

  async resolveEngineEndpoint() {
    const { resourceManager } = this.context;
    const { engineName, engineEndpoint } = this.options;
    if (engineEndpoint) {
      this.engineEndpoint = engineEndpoint;
      return this.engineEndpoint;
    }
    if (engineName) {
      const engine = await resourceManager.engine.getByName(engineName);
      this.engineEndpoint = engine.endpoint;
      return this.engineEndpoint;
    }
    throw new Error("engineName or engineUrl should be provided");
  }

  async ensureEngineRunning() {
    return true;
  }

  private getRequestUrl(executeQueryOptions: ExecuteQueryOptions) {
    const { settings } = executeQueryOptions;
    const { database } = this.options;
    const queryParams = new URLSearchParams({ database, ...settings });
    return `${this.engineEndpoint}?${queryParams}`;
  }

  private getRequestBody(query: string) {
    return query.trim();
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
    const url = this.getRequestUrl(executeQueryOptions);

    const request = httpClient.request<unknown>("POST", url, {
      body,
      raw: true
    });

    this.activeRequests = this.activeRequests.add(request);

    try {
      await request.ready();
      const statement = new Statement(this.context, {
        query,
        request,
        executeQueryOptions
      });
      return statement;
    } finally {
      this.activeRequests.delete(request);
    }
  }

  async destroy() {
    for (const request of this.activeRequests) {
      request.abort();
      this.activeRequests.delete(request);
    }
  }
}
