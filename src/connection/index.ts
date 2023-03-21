import {
  ExecuteQueryOptions,
  ConnectionOptions,
  OutputFormat,
  Context
} from "../types";
import { Statement } from "../statement";
import { generateUserAgent } from "../common/util";
import { data } from "msw/lib/types/context";
import { AccessError } from "../common/errors";

const defaultQuerySettings = {
  output_format: OutputFormat.JSON_COMPACT
};

const defaultResponseSettings = {
  normalizeData: false
};

export class Connection {
  private context: Context;
  private options: ConnectionOptions;
  private userAgent: string;
  engineEndpoint!: string;
  activeRequests = new Set<{ abort: () => void }>();

  constructor(context: Context, options: ConnectionOptions) {
    this.context = context;
    this.options = options;
    this.userAgent = generateUserAgent(
      options.additionalParameters?.userClients,
      options.additionalParameters?.userDrivers
    );
  }

  async resolveEngineEndpoint() {
    const { resourceManager } = this.context;
    const { engineName, database } = this.options;
    if (engineName && database) {
      const engineEndpoint = await resourceManager.engine.getByNameAndDb(
        engineName,
        database
      );
      this.engineEndpoint = engineEndpoint;
      return this.engineEndpoint;
    }
    if (database) {
      const systemUrl = await resourceManager.database.getSytemEngineEndpoint();
      this.engineEndpoint = systemUrl;
      return this.engineEndpoint;
    }
    if (engineName) {
      const database = await resourceManager.engine.getEngineDatabase(
        engineName
      );
      if (!database) {
        throw new AccessError({
          message: `Engine ${engineName} is attached to a database that current user can not access.`
        });
      }
      const engineEndpoint = await resourceManager.engine.getByNameAndDb(
        engineName,
        database
      );
      this.options.database = database;
      this.engineEndpoint = engineEndpoint;
      return this.engineEndpoint;
    }
    // If nothing specified connect to generic system engine
    const systemUrl = await resourceManager.database.getSytemEngineEndpoint();
    this.engineEndpoint = systemUrl;
    return this.engineEndpoint;
  }

  private getRequestUrl(executeQueryOptions: ExecuteQueryOptions) {
    const { settings } = executeQueryOptions;
    const { database } = this.options;
    const params = { database, ...settings };

    const paramsWithValue = Object.keys(params).reduce<Record<string, string>>(
      (acc, key) => {
        const param = params[key as keyof typeof params];
        if (param !== undefined) {
          acc[key] = param;
        }
        return acc;
      },
      {}
    );

    const queryParams = new URLSearchParams(paramsWithValue);
    return `${this.engineEndpoint}?${queryParams}`;
  }

  private getRequestBody(query: string) {
    return query.trim();
  }

  async execute(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<Statement> {
    const { httpClient, queryFormatter } = this.context;

    executeQueryOptions.settings = {
      ...defaultQuerySettings,
      ...(executeQueryOptions.settings || {})
    };

    executeQueryOptions.response = {
      ...defaultResponseSettings,
      ...(executeQueryOptions.response || {})
    };

    const { parameters, namedParameters } = executeQueryOptions;
    const formattedQuery = queryFormatter.formatQuery(
      query,
      parameters,
      namedParameters
    );

    const body = formattedQuery;
    const url = this.getRequestUrl(executeQueryOptions);

    const request = httpClient.request<unknown>("POST", url, {
      headers: { "user-agent": this.userAgent },
      body,
      raw: true
    });

    this.activeRequests = this.activeRequests.add(request);

    try {
      await request.ready();
      const statement = new Statement(this.context, {
        query: formattedQuery,
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
