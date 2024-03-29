import {
  ExecuteQueryOptions,
  ConnectionOptions,
  OutputFormat,
  Context
} from "../types";
import { Statement } from "../statement";
import { generateUserAgent } from "../common/util";
import { ConnectionError } from "../common/errors";

const defaultQuerySettings = {
  output_format: OutputFormat.COMPACT
};

const defaultResponseSettings = {
  normalizeData: false
};

interface AccountInfo {
  id: string;
  infraVersion: number;
}

const updateParametersHeader = "Firebolt-Update-Parameters";
const allowedUpdateParameters = ["database"];
const updateEndpointHeader = "Firebolt-Update-Endpoint";
const resetSessionHeader = "Firebolt-Reset-Session";
const immutableParameters = ["database", "account_id", "output_format"];

export abstract class Connection {
  protected context: Context;
  protected options: ConnectionOptions;
  protected userAgent: string;
  protected parameters: Record<string, string>;
  protected accountInfo: AccountInfo | undefined;
  engineEndpoint!: string;
  activeRequests = new Set<{ abort: () => void }>();

  constructor(context: Context, options: ConnectionOptions) {
    this.context = context;
    this.options = options;
    this.parameters = {
      ...(options.database ? { database: options.database } : {}),
      ...defaultQuerySettings
    };
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

    // convert all settings values to string
    const strSettings = Object.entries(settings ?? {}).reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value.toString();
      }
      return acc;
    }, {});

    return { ...this.parameters, ...strSettings };
  }

  private handleUpdateParametersHeader(headerValue: string) {
    const updateParameters = headerValue
      .split(",")
      .reduce((acc: Record<string, string>, param) => {
        const [key, value] = param.split("=");
        if (allowedUpdateParameters.includes(key)) {
          acc[key] = value.trim();
        }
        return acc;
      }, {});
    this.parameters = {
      ...this.parameters,
      ...updateParameters
    };
  }

  private handleResetSessionHeader() {
    const remainingParameters: Record<string, string> = {};
    for (const key in this.parameters) {
      if (immutableParameters.includes(key)) {
        remainingParameters[key] = this.parameters[key];
      }
    }
    this.parameters = remainingParameters;
  }

  private async handleUpdateEndpointHeader(headerValue: string): Promise<void> {
    const url = new URL(
      headerValue.startsWith("http") ? headerValue : `https://${headerValue}`
    );
    const newParams = Object.fromEntries(url.searchParams.entries());

    // Validate account_id if present
    const currentAccountId =
      this.accountInfo?.id ?? (await this.resolveAccountId());
    if (newParams.account_id && currentAccountId !== newParams.account_id) {
      throw new ConnectionError({
        message: `Failed to execute USE ENGINE command. Account parameter mismatch. Contact support.`
      });
    }

    // Remove url parameters and update engineEndpoint
    this.engineEndpoint = url.toString().replace(url.search, "");
    this.parameters = {
      ...this.parameters,
      ...newParams
    };
  }

  private async processHeaders(headers: Headers) {
    const updateHeaderValue = headers.get(updateParametersHeader);
    if (updateHeaderValue) {
      this.handleUpdateParametersHeader(updateHeaderValue);
    }

    if (headers.has(resetSessionHeader)) {
      this.handleResetSessionHeader();
    }

    const updateEndpointValue = headers.get(updateEndpointHeader);
    if (updateEndpointValue) {
      await this.handleUpdateEndpointHeader(updateEndpointValue);
    }
  }

  async execute(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<Statement> {
    const { httpClient, queryFormatter } = this.context;

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
      await this.processHeaders(response.headers);
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
