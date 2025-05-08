import { AccountNotFoundError, ApiError } from "../common/errors";
import { ACCOUNT_SYSTEM_ENGINE, QUERY_URL } from "../common/api";

import { Connection as BaseConnection } from "./base";
import { Cache, inMemoryCache, noneCache } from "../common/tokenCache";
import { ExecuteQueryOptions, OutputFormat } from "../types";
import { AsyncStatement } from "../statement/async";
import { StreamStatement } from "../statement/stream";
import { Statement } from "../statement";

export class ConnectionV2 extends BaseConnection {
  private get account(): string {
    if (!this.options.account) {
      throw new Error("Account name is required");
    }
    return this.options.account;
  }

  private get cache(): Cache {
    return this.options.useCache ?? true ? inMemoryCache : noneCache;
  }

  private async getSystemEngineEndpointAndParameters(): Promise<
    [string, Record<string, string>]
  > {
    const { apiEndpoint, httpClient } = this.context;

    const cachedValue = this.cache.engineUrlStorage.get({
      account: this.account,
      apiEndpoint
    });
    if (cachedValue) {
      return [cachedValue.engineUrl, cachedValue.params];
    }

    const accountName = this.account;
    const url = `${apiEndpoint}/${ACCOUNT_SYSTEM_ENGINE(accountName)}`;
    try {
      const { engineUrl } = await httpClient
        .request<{ engineUrl: string }>("GET", url)
        .ready();
      const [finalUrl, params] = this.splitEndpoint(engineUrl);
      this.cache.engineUrlStorage.set(
        {
          account: accountName,
          apiEndpoint
        },
        { engineUrl: finalUrl, params }
      );
      return [finalUrl, params];
    } catch (e) {
      if (e instanceof ApiError && e.status == 404) {
        throw new AccountNotFoundError({ account_name: accountName });
      }
      throw e;
    }
  }

  async resolveEngineEndpoint() {
    const { engineName, database } = this.options;
    // Connect to system engine first
    const [systemUrl, systemParameters] =
      await this.getSystemEngineEndpointAndParameters();
    this.engineEndpoint = new URL(QUERY_URL, systemUrl).href;
    this.parameters = { ...this.parameters, ...systemParameters };

    if (database) {
      await this.execute(`USE DATABASE "${database}"`);
    }
    if (engineName) {
      await this.execute(`USE ENGINE "${engineName}"`);
    }

    return this.engineEndpoint;
  }

  // Async methods
  async executeAsync(
    query: string,
    executeQueryOptions: ExecuteQueryOptions = {}
  ): Promise<AsyncStatement> {
    const asyncExecuteQueryOptions = {
      ...executeQueryOptions,
      settings: {
        ...executeQueryOptions.settings,
        async: true
      }
    };

    if (this.queryFormatter.isSetStatement(query)) {
      // can't have an async set query
      throw new Error("SET statements cannot be executed asynchronously.");
    }
    const { formattedQuery, text } = await this.prepareAndExecuteQuery(
      query,
      asyncExecuteQueryOptions
    );

    return new AsyncStatement(this.context, {
      query: formattedQuery,
      text,
      executeQueryOptions: asyncExecuteQueryOptions
    });
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
    if (this.options.useServerSidePreparedStatement) {
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
      query: query,
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

  private async getAsyncQueryInfo(token: string) {
    const query = `CALL fb_GetAsyncStatus('${token}')`;

    const statement = await this.execute(query);
    const { data, meta } = await statement.fetchResult();
    const result: Record<string, any> = {};
    if (data.length > 0) {
      meta.forEach((field, index) => {
        result[field.name] = data[0][index];
      });
    } else {
      throw new Error("No data returned from fb_GetAsyncStatus");
    }
    return result;
  }

  async isAsyncQueryRunning(token: string): Promise<boolean> {
    const info = await this.getAsyncQueryInfo(token);
    return info["status"] === "RUNNING";
  }

  async isAsyncQuerySuccessful(token: string): Promise<boolean | undefined> {
    const info = await this.getAsyncQueryInfo(token);
    if (info["status"] === "RUNNING") {
      return undefined;
    }
    return info["status"] === "ENDED_SUCCESSFULLY";
  }

  async cancelAsyncQuery(token: string): Promise<void> {
    const info = await this.getAsyncQueryInfo(token);
    const async_query_id = info["query_id"];
    this.execute(`CANCEL QUERY WHERE query_id='${async_query_id}'`);
  }

  async testConnection() {
    const settings = { internal: [{ auto_start_stop_control: "ignore" }] };
    await this.execute("select 1", { settings });
  }
}
