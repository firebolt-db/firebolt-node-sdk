import { ExecuteQueryOptions } from "../types";
import {
  AccessError,
  AccountNotFoundError,
  ApiError,
  ConnectionError
} from "../common/errors";
import {
  ACCOUNT_ID_BY_NAME,
  ACCOUNT_SYSTEM_ENGINE,
  QUERY_URL
} from "../common/api";

import { Connection as BaseConnection } from "./base";

export class ConnectionV2 extends BaseConnection {
  private get account(): string {
    if (!this.options.account) {
      throw new Error("Account name is required");
    }
    return this.options.account;
  }

  private async getSystemEngineEndpoint(): Promise<string> {
    const { apiEndpoint, httpClient } = this.context;
    const accountName = this.account;
    const url = `${apiEndpoint}/${ACCOUNT_SYSTEM_ENGINE(accountName)}`;
    try {
      const { engineUrl } = await httpClient
        .request<{ engineUrl: string }>("GET", url)
        .ready();
      return engineUrl;
    } catch (e) {
      if (e instanceof ApiError && e.status == 404) {
        throw new AccountNotFoundError({ account_name: accountName });
      }
      throw e;
    }
  }

  private async isDatabaseAccessible(databaseName: string): Promise<boolean> {
    const query =
      "SELECT database_name FROM information_schema.databases " +
      `WHERE database_name='${databaseName}'`;

    const statement = await this.execute(query);
    const { data } = await statement.fetchResult();
    return data.length == 1;
  }

  private async getEngineUrl(
    engineName: string,
    databaseName: string
  ): Promise<string> {
    const query =
      "SELECT engs.url, dbs.database_name, engs.status " +
      "FROM information_schema.engines as engs " +
      "LEFT JOIN information_schema.databases as dbs " +
      "ON engs.attached_to = dbs.database_name " +
      `WHERE engs.engine_name = '${engineName}'`;
    const statement = await this.execute(query);
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new ConnectionError({ message: `Engine ${engineName} not found.` });
    }
    const filteredRows = [];
    for (const row of data) {
      const [, engintDbName, ,] = row as string[];
      if (engintDbName == databaseName) {
        filteredRows.push(row);
      }
    }
    if (filteredRows.length == 0) {
      throw new ConnectionError({
        message: `Engine ${engineName} is not attached to ${databaseName}.`
      });
    }
    if (filteredRows.length > 1) {
      throw new Error(
        `Unexpected duplicate entries found for ${engineName} and database ${databaseName}`
      );
    }
    const [engineUrl, , status] = filteredRows[0] as string[];
    if (status != "Running") {
      throw new ConnectionError({
        message: `Engine ${engineName} is not running`
      });
    }
    return engineUrl;
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
    const query =
      "SELECT attached_to FROM information_schema.engines " +
      `WHERE engine_name='${engineName}'`;

    const statement = await this.execute(query);
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      return "";
    }
    const res = data[0] as string[];
    if (res.length == 0) {
      return "";
    }
    return res[0];
  }

  async resolveAccountInfo() {
    const { httpClient, apiEndpoint } = this.context;
    const url = `${apiEndpoint}/${ACCOUNT_ID_BY_NAME(this.account)}`;
    const { id, infraVersion } = await httpClient
      .request<{ id: string; region: string; infraVersion: string }>("GET", url)
      .ready();
    return { id, infraVersion: parseInt(infraVersion ?? "1") };
  }

  async resolveAccountId() {
    const accInfo = await this.resolveAccountInfo();
    return accInfo.id;
  }

  async resolveEngineEndpoint() {
    const { engineName, database } = this.options;
    // Connect to system engine first
    const systemUrl = await this.getSystemEngineEndpoint();
    this.engineEndpoint = `${systemUrl}/${QUERY_URL}`;
    this.accountInfo = await this.resolveAccountInfo();
    if (engineName && database) {
      const engineEndpoint = await this.getEngineByNameAndDb(
        engineName,
        database
      );
      this.engineEndpoint = engineEndpoint;
      // Account id is no longer needed
      this.accountInfo = undefined;
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
      this.parameters["database"] = database;
      this.engineEndpoint = engineEndpoint;
      // Account id is no longer needed
      this.accountInfo = undefined;
      return this.engineEndpoint;
    }
    // If nothing specified connect to generic system engine
    return this.engineEndpoint;
  }

  protected getBaseParameters(
    executeQueryOptions: ExecuteQueryOptions
  ): Record<string, string | undefined> {
    return {
      account_id: this.accountInfo?.id,
      ...super.getBaseParameters(executeQueryOptions)
    };
  }
}
