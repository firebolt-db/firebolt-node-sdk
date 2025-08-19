import { ACCOUNT, ACCOUNT_BY_NAME } from "../common/api";
import { Connection as BaseConnection } from "./base";
import { ResourceManager } from "../service";
import { ExecuteQueryOptions } from "../types";
import { AsyncStatement } from "../statement/async";
import { StreamStatement } from "../statement/stream";

export interface AccountInfo {
  id: string;
}

export class ConnectionV1 extends BaseConnection {
  protected accountInfo: AccountInfo | undefined;

  async resolveEngineEndpoint() {
    const resourceManager = new ResourceManager({
      connection: this,
      ...this.context
    });
    const { engineName, engineEndpoint, database } = this.options;
    if (engineEndpoint) {
      this.engineEndpoint = engineEndpoint;
      return this.engineEndpoint;
    }
    if (engineName) {
      const engine = await resourceManager.engine.getByName(engineName);
      this.engineEndpoint = engine.endpoint;
      return this.engineEndpoint;
    }
    const defaultUrl = await resourceManager.database.getDefaultEndpointByName(
      database as string
    );
    this.engineEndpoint = defaultUrl;
    return this.engineEndpoint;
  }

  async resolveAccountId() {
    const accInfo = await this.resolveAccountInfo();
    return accInfo.id;
  }

  async resolveAccountInfo(): Promise<AccountInfo> {
    if (this.accountInfo === undefined) {
      const { httpClient, apiEndpoint } = this.context;
      const { account } = this.options;
      if (account) {
        const queryParams = new URLSearchParams({ account_name: account });
        const url = `${apiEndpoint}/${ACCOUNT_BY_NAME}?${queryParams}`;
        const { account_id } = await httpClient
          .request<{ account_id: string }>("GET", url)
          .ready();
        this.accountInfo = { id: account_id };
      } else {
        const url = `${apiEndpoint}/${ACCOUNT}`;
        const {
          account: { id }
        } = await httpClient
          .request<{ account: { id: string } }>("GET", url)
          .ready();
        this.accountInfo = { id };
      }
    }
    return this.accountInfo;
  }

  async testConnection() {
    await this.execute("select 1");
  }

  // Async methods
  async isAsyncQueryRunning(token: string): Promise<boolean> {
    throw new Error(
      "Asynchronous query running check is not supported in this Firebolt version."
    );
  }

  async isAsyncQuerySuccessful(token: string): Promise<boolean | undefined> {
    throw new Error(
      "Asynchronous query success check is not supported in this Firebolt version."
    );
  }

  async cancelAsyncQuery(token: string): Promise<void> {
    throw new Error(
      "Asynchronous query cancellation is not supported in this Firebolt version."
    );
  }

  async executeAsync(
    query: string,
    executeQueryOptions?: ExecuteQueryOptions
  ): Promise<AsyncStatement> {
    throw new Error(
      "Asynchronous execution is not supported in this Firebolt version."
    );
  }

  async executeStream(
    query: string,
    executeQueryOptions?: ExecuteQueryOptions
  ): Promise<StreamStatement> {
    throw new Error(
      "Stream execution is not supported in this Firebolt version."
    );
  }

  async begin(): Promise<void> {
    throw new Error(
      "Transaction management is not supported in this Firebolt version."
    );
  }

  async commit(): Promise<void> {
    throw new Error(
      "Transaction management is not supported in this Firebolt version."
    );
  }

  async rollback(): Promise<void> {
    throw new Error(
      "Transaction management is not supported in this Firebolt version."
    );
  }
}
