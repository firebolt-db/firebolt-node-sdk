import { AccountNotFoundError, ApiError } from "../common/errors";
import { ACCOUNT_SYSTEM_ENGINE, QUERY_URL } from "../common/api";

import { Connection as BaseConnection } from "./base";
import { Cache, inMemoryCache, noneCache } from "../common/tokenCache";
import { ExecuteQueryOptions } from "../types";
import { AsyncStatement } from "../statement/async";

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
    const { formattedQuery, response } = await this.prepareAndExecuteQuery(
      query,
      asyncExecuteQueryOptions
    );

    const text = await response.text();
    await this.throwErrorIfErrorBody(text, response);
    return new AsyncStatement(this.context, {
      query: formattedQuery,
      text,
      executeQueryOptions: asyncExecuteQueryOptions
    });
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
