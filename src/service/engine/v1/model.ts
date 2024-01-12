import {
  ACCOUNT_ENGINE,
  ACCOUNT_ENGINE_START,
  ACCOUNT_ENGINE_STOP,
  ACCOUNT_ENGINE_RESTART
} from "../../../common/api";
import { ResourceManagerContext } from "../../../types";
import { ID, Engine, EngineStatusSummary } from "./types";

export class EngineModel {
  private readonly context: ResourceManagerContext;
  id: ID;
  name: string;
  description: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;

  constructor(context: ResourceManagerContext, engine: Engine) {
    const { id, name, description, endpoint, current_status_summary } = engine;
    this.id = id;
    this.name = name;
    this.description = description;
    this.endpoint = endpoint;
    this.context = context;
    this.current_status_summary = current_status_summary;
  }

  private get accountId(): Promise<string> {
    return this.context.connection.resolveAccountId();
  }

  async start() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_START(
      await this.accountId,
      id
    )}`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async startAndWait(): Promise<{ engine: Engine }> {
    const {
      engine: { current_status_summary }
    } = await this.start();
    this.current_status_summary = current_status_summary;
    if (this.current_status_summary.includes("RUNNING")) {
      return { engine: this };
    }

    let interval: NodeJS.Timer;
    await new Promise<void>(resolve => {
      interval = setInterval(() => {
        // wrap in async function to use await
        (async () => {
          await this.refreshStatus();
          if (this.current_status_summary.includes("RUNNING")) {
            return resolve();
          }
        })();
      }, 10 * 1000); // Check every 10 seconds.
    }).finally(() => {
      if (interval) {
        clearInterval(interval);
      }
    });
    return { engine: this };
  }

  async stop() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_STOP(
      await this.accountId,
      id
    )}`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async restart() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_RESTART(
      await this.accountId,
      id
    )}`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  private async refreshStatus() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE(await this.accountId, id)}`;
    const {
      engine: { current_status_summary }
    } = await httpClient.request<{ engine: Engine }>("GET", url).ready();
    this.current_status_summary = current_status_summary;
  }

  async delete() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE(await this.accountId, id)}`;
    await httpClient.request("DELETE", url).ready();
  }
}
