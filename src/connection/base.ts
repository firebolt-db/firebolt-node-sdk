import {
  ExecuteQueryOptions,
  ConnectionOptions,
  OutputFormat,
  Context
} from "../types";
import { Statement } from "../statement";
import { generateUserAgent } from "../common/util";

const defaultQuerySettings = {
  output_format: OutputFormat.COMPACT
};

const defaultResponseSettings = {
  normalizeData: false
};

const updateParametersHeader = "Firebolt-Update-Parameters";
const allowedUpdateParameters = ["database"];

export abstract class Connection {
  protected context: Context;
  protected options: ConnectionOptions;
  protected userAgent: string;
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

  abstract resolveEngineEndpoint(): Promise<string>;

  abstract resolveAccountId(): Promise<string>;

  protected getRequestUrl(executeQueryOptions: ExecuteQueryOptions): string {
    const params = this.getBaseParameters(executeQueryOptions);

    const paramsWithValue = Object.keys(params).reduce<Record<string, string>>(
      (acc, key) => {
        const param = params[key];
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

  protected getBaseParameters(
    executeQueryOptions: ExecuteQueryOptions
  ): Record<string, string | undefined> {
    const { settings } = executeQueryOptions;
    const { database } = this.options;
    return { database, ...settings };
  }

  private processHeaders(headers: Headers) {
    const updateHeaderValue = headers.get(updateParametersHeader);
    if (updateHeaderValue) {
      const updateParameters = updateHeaderValue
        .split(",")
        .reduce((acc: Record<string, string>, param) => {
          const [key, value] = param.split("=");
          if (allowedUpdateParameters.includes(key)) {
            acc[key] = value.trim();
          }
          return acc;
        }, {});

      if (updateParameters.database) {
        this.options.database = updateParameters.database;
        delete updateParameters.database;
      }
      this.options.additionalParameters = {
        ...this.options.additionalParameters,
        ...updateParameters
      };
    }
  }

  async execute(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<Statement> {
    const { httpClient, queryFormatter } = this.context;

    executeQueryOptions.settings = {
      ...defaultQuerySettings,
      ...(executeQueryOptions.settings ?? {})
    };

    executeQueryOptions.response = {
      ...defaultResponseSettings,
      ...(executeQueryOptions.response ?? {})
    };

    const { parameters, namedParameters } = executeQueryOptions;
    const formattedQuery = queryFormatter.formatQuery(
      query,
      parameters,
      namedParameters
    );

    const body = formattedQuery;
    const url = this.getRequestUrl(executeQueryOptions);

    const request = httpClient.request<Response>("POST", url, {
      headers: { "user-agent": this.userAgent },
      body,
      raw: true
    });

    this.activeRequests = this.activeRequests.add(request);

    try {
      const response = await request.ready();
      this.processHeaders(response.headers);
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

  public get httpClient() {
    return this.context.httpClient;
  }
}
