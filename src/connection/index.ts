import {
  ExecuteQueryOptions,
  ConnectionOptions,
  OutputFormat,
  Context
} from "../types";
import { Statement } from "../statement";
import { generateUserAgent } from "../common/util";
import { AccessError } from "../common/errors";
import { ACCOUNT_SYSTEM_ENGINE, QUERY } from "../common/api";

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

  private async getSytemEngineEndpoint(): Promise<string> {
    const { apiEndpoint, httpClient } = this.context;
    const accountName = this.context.resourceManager.account.name; // TODO: make sure this exists
    const url = `${apiEndpoint}/${ACCOUNT_SYSTEM_ENGINE(accountName)}`;
    const data = await httpClient
      .request<{ engineUrl: string }>("GET", url)
      .ready();
    return data.engineUrl;
  }

  private async isDatabaseAccessible(databaseName: string): Promise<boolean> {
    const { httpClient } = this.context;
    const systemUrl = await this.getSytemEngineEndpoint();
    const body =
      "SELECT database_name FROM information_schema.databases " +
      `WHERE database_name='${databaseName}'`;
    const request = httpClient.request<unknown>("POST", systemUrl, {
      body,
      raw: true
    });
    await request.ready();
    const statement = new Statement(this.context, {
      query: body,
      request,
      executeQueryOptions: {}
    });
    const { data } = await statement.fetchResult();
    return data.length == 1;
  }

  private async getEngineUrl(
    engineName: string,
    databaseName: string
  ): Promise<string> {
    const { httpClient } = this.context;
    const systemUrl = await this.getSytemEngineEndpoint();
    const body =
      "SELECT engs.engine_url, engs.attached_to, dbs.database_name, status " +
      "FROM information_schema.engines as engs " +
      "LEFT JOIN information_schema.databases as dbs " +
      "ON engs.attached_to = dbs.database_name " +
      `WHERE engs.engine_name = '${engineName}'`;
    const request = httpClient.request<unknown>("POST", systemUrl, {
      body,
      raw: true
    });
    await request.ready();
    const statement = new Statement(this.context, {
      query: body,
      request,
      executeQueryOptions: {}
    });
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new Error(`Engine ${engineName} not found.`);
    }
    const filteredRows = [];
    for (const row of data) {
      if ((row as Record<string, string>).database_name == databaseName) {
        filteredRows.push(row);
      }
    }
    if (filteredRows.length == 0) {
      throw new Error(
        `Engine ${engineName} is not attached to ${databaseName}.`
      );
    }
    if (filteredRows.length > 1) {
      throw new Error(
        `Unexpected duplicate entries found for ${engineName} and database ${databaseName}`
      );
    }
    if ((filteredRows[0] as Record<string, string>).status != "RUNNING") {
      throw new Error(`Engine ${engineName} is not running`);
    }
    return (filteredRows[0] as Record<string, string>).engine_url;
  }

  private async getEngineByNameAndDb(
    engineName: string,
    database: string
  ): Promise<string> {
    // Verify user has access to the db
    // Probably migrate it to database module
    const haveAccess = await this.isDatabaseAccessible(database);
    if (!haveAccess) {
      throw new AccessError({
        message: `Database ${database} does not exist or current user has no access to it.`
      });
    }
    // Fetch engine url
    const engineUrl = await this.getEngineUrl(engineName, database);
    return engineUrl;
  }

  private async getEngineDatabase(engineName: string): Promise<string> {
    const { httpClient } = this.context;
    const systemUrl = await this.getSytemEngineEndpoint();
    const body =
      "SELECT attached_to FROM information_schema.engines " +
      `WHERE engine_name='${engineName}'`;
    const request = httpClient.request<unknown>("POST", systemUrl, {
      body,
      raw: true
    });
    await request.ready();
    const statement = new Statement(this.context, {
      query: body,
      request,
      executeQueryOptions: {}
    });
    const { data } = await statement.fetchResult();
    const res = data[0] as Record<string, string>;
    return res.attached_to;
  }

  async resolveEngineEndpoint() {
    const { engineName, database } = this.options;
    if (engineName && database) {
      const engineEndpoint = await this.getEngineByNameAndDb(
        engineName,
        database
      );
      this.engineEndpoint = engineEndpoint;
      return this.engineEndpoint;
    }
    if (database) {
      const systemUrl = await this.getSytemEngineEndpoint();
      this.engineEndpoint = systemUrl;
      return this.engineEndpoint;
    }
    if (engineName) {
      const database = await this.getEngineDatabase(engineName);
      if (!database) {
        throw new AccessError({
          message: `Engine ${engineName} is attached to a database that current user can not access.`
        });
      }
      const engineEndpoint = await this.getEngineByNameAndDb(
        engineName,
        database
      );
      this.options.database = database;
      this.engineEndpoint = engineEndpoint;
      return this.engineEndpoint;
    }
    // If nothing specified connect to generic system engine
    const systemUrl = await this.getSytemEngineEndpoint();
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
    return `${this.engineEndpoint}/${QUERY}?${queryParams}`;
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
