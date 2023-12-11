import {
  ACCOUNT_ENGINE,
  ACCOUNT_ENGINE_START,
  ACCOUNT_ENGINE_STOP,
  ACCOUNT_ENGINE_RESTART
} from "../../../common/api";
import { Context } from "../../../types";
import { ID, Engine, EngineStatusSummary } from "./types";

export class EngineModel {
  private context: Context;
  id: ID;
  name: string;
  description: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;

  constructor(context: Context, engine: Engine) {
    const { id, name, description, endpoint, current_status_summary } = engine;
    this.id = id;
    this.name = name;
    this.description = description;
    this.endpoint = endpoint;
    this.context = context;
    this.current_status_summary = current_status_summary;
  }

  async start() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const accountId = this.context.resourceManager.account.id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_START(accountId, id)}`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async startAndWait() {
    const {
      engine: { current_status_summary }
    } = await this.start();
    this.current_status_summary = current_status_summary;
    if (this.current_status_summary.includes("RUNNING")) {
      return;
    }

    let interval: NodeJS.Timer;
    await new Promise<void>(resolve => {
      interval = setInterval(async () => {
        await this.refreshStatus();
        if (this.current_status_summary.includes("RUNNING")) {
          return resolve();
        }
      }, 10 * 1000); // Check every 10 seconds.
    }).finally(() => {
      if (interval) {
        clearInterval(interval);
      }
    });
  }

  async stop() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const accountId = this.context.resourceManager.account.id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_STOP(accountId, id)}`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async restart() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const accountId = this.context.resourceManager.account.id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_RESTART(accountId, id)}`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  private async refreshStatus() {
    const { apiEndpoint, httpClient } = this.context;
    const id = this.id.engine_id;
    const accountId = this.context.resourceManager.account.id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE(accountId, id)}`;
    const {
      engine: { current_status_summary }
    } = await httpClient.request<{ engine: Engine }>("GET", url).ready();
    this.current_status_summary = current_status_summary;
  }
}