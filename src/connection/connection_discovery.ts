import { Connection as BaseConnection } from "./base";
import {
  Context,
  DiscoveryConnectionOptions,
  ExecuteQueryOptions,
  OutputFormat
} from "../types";
import { AsyncStatement } from "../statement/async";
import { StreamStatement } from "../statement/stream";
import { Statement } from "../statement";
import { QueryFormatter } from "../formatter/base";

type DiscoveryDocument = {
  query_url?: string;
  queryUrl?: string;
  engine_url?: string;
  engineUrl?: string;
  endpoint?: string;
  url?: string;
  endpoints?: {
    query?: string;
    query_url?: string;
    queryUrl?: string;
    sql?: string;
    engine?: string;
  };
  parameters?: Record<string, unknown>;
  params?: Record<string, unknown>;
};

export class ConnectionDiscovery extends BaseConnection<DiscoveryConnectionOptions> {
  constructor(
    queryFormatter: QueryFormatter,
    context: Context,
    options: DiscoveryConnectionOptions
  ) {
    super(queryFormatter, context, options);
    const engine = this.options.engine ?? this.options.engineName;
    if (engine) {
      this.parameters.engine = engine;
    }
  }

  private getHostUrl(): URL {
    const hasProtocol = /^https?:\/\//i.test(this.options.host);
    const protocol = this.options.ssl_mode === "disable" ? "http" : "https";
    const url = new URL(
      hasProtocol ? this.options.host : `${protocol}://${this.options.host}`
    );
    if (this.options.port !== undefined) {
      url.port = this.options.port.toString();
    }
    return url;
  }

  private getDiscoveryUrl(): URL {
    const hostUrl = this.getHostUrl();
    return new URL("/.well-known/firebolt", hostUrl);
  }

  private getDiscoveredQueryEndpoint(
    discoveryDocument: DiscoveryDocument,
    discoveryUrl: URL
  ): string {
    const endpoint =
      discoveryDocument.query_url ??
      discoveryDocument.queryUrl ??
      discoveryDocument.engine_url ??
      discoveryDocument.engineUrl ??
      discoveryDocument.endpoint ??
      discoveryDocument.url ??
      discoveryDocument.endpoints?.query ??
      discoveryDocument.endpoints?.query_url ??
      discoveryDocument.endpoints?.queryUrl ??
      discoveryDocument.endpoints?.sql ??
      discoveryDocument.endpoints?.engine;

    if (!endpoint) {
      return new URL("/", discoveryUrl).toString();
    }

    return new URL(endpoint, discoveryUrl).toString();
  }

  private getDiscoveredParameters(
    discoveryDocument: DiscoveryDocument
  ): Record<string, string> {
    const parameters = discoveryDocument.parameters ?? discoveryDocument.params;
    if (!parameters) {
      return {};
    }

    return Object.entries(parameters).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      },
      {}
    );
  }

  async resolveEngineEndpoint(): Promise<string> {
    const discoveryUrl = this.getDiscoveryUrl();
    const discoveryDocument = await this.context.httpClient
      .request<DiscoveryDocument>("GET", discoveryUrl.toString(), {
        noAuth: true
      })
      .ready();

    const [endpoint, endpointParameters] = this.splitEndpoint(
      this.getDiscoveredQueryEndpoint(discoveryDocument, discoveryUrl)
    );

    this.engineEndpoint = endpoint;
    this.parameters = {
      ...this.getDiscoveredParameters(discoveryDocument),
      ...endpointParameters,
      ...this.parameters
    };

    return this.engineEndpoint;
  }

  async testConnection(): Promise<void> {
    await this.execute("SELECT 1");
  }

  async executeAsync(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<AsyncStatement> {
    throw new Error("Async queries are not supported for discovery connections");
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

  async execute(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<Statement> {
    if (this.options.preparedStatementParamStyle === "fb_numeric") {
      return this.executePreparedStatement(query, executeQueryOptions);
    }
    return super.execute(query, executeQueryOptions);
  }

  private async executePreparedStatement(
    query: string,
    executeQueryOptions: ExecuteQueryOptions
  ): Promise<Statement> {
    const { text } = await this.executeQuery(
      query,
      this.getExecuteQueryOptionsForPreparedStatement(executeQueryOptions)
    );

    return new Statement(this.context, {
      query,
      text,
      executeQueryOptions
    });
  }

  private getExecuteQueryOptionsForPreparedStatement(
    executeQueryOptions: ExecuteQueryOptions
  ): ExecuteQueryOptions {
    let queryParameters;
    if (!executeQueryOptions.parameters) {
      queryParameters = Object.entries(
        executeQueryOptions.namedParameters || {}
      ).map(([key, value]) => ({ name: key, value }));
    } else if (!executeQueryOptions.namedParameters) {
      queryParameters = executeQueryOptions.parameters.map((value, index) => ({
        name: `$${index + 1}`,
        value
      }));
    } else {
      throw new Error(
        "Server-side prepared statement can only use either parameters or namedParameters"
      );
    }

    return {
      settings: {
        ...executeQueryOptions.settings,
        query_parameters: JSON.stringify(queryParameters)
      },
      ...executeQueryOptions
    };
  }

  async isAsyncQueryRunning(token: string): Promise<boolean> {
    throw new Error("Async queries are not supported for discovery connections");
  }

  async isAsyncQuerySuccessful(token: string): Promise<boolean | undefined> {
    throw new Error("Async queries are not supported for discovery connections");
  }

  async cancelAsyncQuery(token: string): Promise<void> {
    throw new Error("Async queries are not supported for discovery connections");
  }
}
