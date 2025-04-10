import {
  ExecuteQueryOptions,
  ConnectionOptions,
  OutputFormat,
  Context
} from "../types";
import { Statement } from "../statement";
import { generateUserAgent } from "../common/util";
import { CompositeError } from "../common/errors";
import JSONbig from "json-bigint";
import { QueryFormatter } from "../formatter/base";
import { AsyncStatement } from "../statement/async";
import { StreamStatement } from "../statement/stream";
import { Response, Headers } from "node-fetch";

const defaultQuerySettings = {
  output_format: OutputFormat.COMPACT
};

export const defaultResponseSettings = {
  normalizeData: false
};

const updateParametersHeader = "Firebolt-Update-Parameters";
const allowedUpdateParameters = ["database"];
const updateEndpointHeader = "Firebolt-Update-Endpoint";
const resetSessionHeader = "Firebolt-Reset-Session";
const immutableParameters = ["database", "account_id", "output_format"];
const testConnectionQuery = "SELECT 1";

export abstract class Connection {
  protected context: Context;
  protected queryFormatter: QueryFormatter;
  protected options: ConnectionOptions;
  protected userAgent: string;
  protected parameters: Record<string, string>;
  engineEndpoint!: string;
  activeRequests = new Set<{ abort: () => void }>();

  constructor(
    queryFormatter: QueryFormatter,
    context: Context,
    options: ConnectionOptions
  ) {
    this.context = context;
    this.options = options;
    this.queryFormatter = queryFormatter;
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

  abstract testConnection(): Promise<void>;

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
      if (key === "internal") {
        // Unwrap internal settings from array
        const internalSettings = value as Record<string, string | number>[];
        internalSettings.forEach(setting => {
          Object.entries(setting).forEach(([internalKey, internalValue]) => {
            acc[internalKey] = internalValue.toString();
          });
        });
      } else if (value !== undefined) {
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

  protected splitEndpoint(endpoint: string): [string, Record<string, string>] {
    const url = new URL(
      endpoint.startsWith("http") ? endpoint : `https://${endpoint}`.trim()
    );
    const params = Object.fromEntries(url.searchParams.entries());
    return [url.toString().replace(url.search, ""), params];
  }

  private async handleUpdateEndpointHeader(headerValue: string): Promise<void> {
    const [endpoint, newParams] = this.splitEndpoint(headerValue);
    // Remove url parameters and update engineEndpoint
    this.engineEndpoint = endpoint;
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

  abstract executeAsync(
    query: string,
    executeQueryOptions?: ExecuteQueryOptions
  ): Promise<AsyncStatement>;

  abstract executeStream(
    query: string,
    executeQueryOptions?: ExecuteQueryOptions
  ): Promise<StreamStatement>;

  abstract isAsyncQueryRunning(token: string): Promise<boolean>;

  abstract isAsyncQuerySuccessful(token: string): Promise<boolean | undefined>;

  abstract cancelAsyncQuery(token: string): Promise<void>;

  protected async prepareAndExecuteQuery(
    query: string,
    executeQueryOptions: ExecuteQueryOptions
  ): Promise<{ formattedQuery: string; response: Response }> {
    const { httpClient } = this.context;

    executeQueryOptions.response = {
      ...defaultResponseSettings,
      ...(executeQueryOptions.response ?? {})
    };

    const { parameters, namedParameters } = executeQueryOptions;

    let setKey = "",
      setValue = "",
      formattedQuery: string;
    if (this.queryFormatter.isSetStatement(query)) {
      [setKey, setValue] = this.queryFormatter.splitSetStatement(query);
      this.parameters[setKey] = setValue;
      formattedQuery = testConnectionQuery;
    } else {
      formattedQuery = this.queryFormatter.formatQuery(
        query,
        parameters,
        namedParameters
      );
    }

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
      return { formattedQuery, response };
    } catch (error) {
      // In case it was a set query, remove set parameter if query fails
      if (setKey.length > 0) {
        delete this.parameters[setKey];
      }
      throw error;
    } finally {
      this.activeRequests.delete(request);
    }
  }

  async execute(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<Statement> {
    const { formattedQuery, response } = await this.prepareAndExecuteQuery(
      query,
      executeQueryOptions
    );

    const text = await response.text();
    await this.throwErrorIfErrorBody(text, response);
    return new Statement(this.context, {
      query: formattedQuery,
      text,
      executeQueryOptions
    });
  }

  protected async throwErrorIfErrorBody(text: string, response: Response) {
    // Hack, but looks like this is a limitation of the fetch API
    // In order to read the body here and elesewhere, we need to clone the response
    // since body can only be read once
    let json;
    try {
      json = JSONbig.parse(text);
    } catch (error) {
      // If we can't parse the JSON, we'll have to ignore it
      if (this.hasJsonContent(response)) {
        console.info("Failed to parse JSON response:", error);
      }
    }
    if (json?.errors) throw new CompositeError(json.errors);
  }

  private hasJsonContent(res: Response): boolean {
    const contentType = res.headers.get("Content-Type");
    return !!contentType?.includes("application/json");
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
