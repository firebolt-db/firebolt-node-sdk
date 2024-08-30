import { AccountNotFoundError, ApiError } from "../common/errors";
import {
  ACCOUNT_ID_BY_NAME,
  ACCOUNT_SYSTEM_ENGINE,
  QUERY_URL
} from "../common/api";

import { Connection as BaseConnection } from "./base";
import { Cache, inMemoryCache, noneCache } from "../common/tokenCache";

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
}
