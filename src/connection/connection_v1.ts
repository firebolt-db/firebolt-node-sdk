import { ACCOUNT, ACCOUNT_BY_NAME } from "../common/api";
import { Connection as BaseConnection } from "./base";
import { ResourceManager } from "../service";

export class ConnectionV1 extends BaseConnection {
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

  async resolveAccountInfo() {
    if (this.accountInfo === undefined) {
      const { httpClient, apiEndpoint } = this.context;
      const { account } = this.options;
      if (account) {
        const queryParams = new URLSearchParams({ account_name: account });
        const url = `${apiEndpoint}/${ACCOUNT_BY_NAME}?${queryParams}`;
        const { account_id } = await httpClient
          .request<{ account_id: string }>("GET", url)
          .ready();
        this.accountInfo = { id: account_id, infraVersion: 1 };
      } else {
        const url = `${apiEndpoint}/${ACCOUNT}`;
        const {
          account: { id }
        } = await httpClient
          .request<{ account: { id: string } }>("GET", url)
          .ready();
        this.accountInfo = { id, infraVersion: 1 };
      }
    }
    return this.accountInfo;
  }
}
