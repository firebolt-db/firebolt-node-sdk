import { ENGINE_ID_BY_NAME, ACCOUNTS } from "../common/api";
import { Context } from "../types";

type Engine = {
  endpoint: string;
};

type EngineId = { engine_id: string; account_id: string };

export class EngineService {
  context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  private async getEngineId(engineName: string) {
    const { httpClient, apiUrl } = this.context;
    const queryParams = new URLSearchParams({ engine_name: engineName });
    const url = `${apiUrl}/${ENGINE_ID_BY_NAME}?${queryParams}`;
    const data = await httpClient.request<{ engine_id: EngineId }>("GET", url);
    return data.engine_id;
  }

  async getById(engineId: string, accountId: string) {
    const { httpClient, apiUrl } = this.context;
    const url = `${apiUrl}/${ACCOUNTS}/${accountId}/engines/${engineId}`;
    const data = await httpClient.request<{ engine: Engine }>("GET", url);
    return data.engine;
  }

  async getByName(engineName: string) {
    const data = await this.getEngineId(engineName);
    const { engine_id, account_id } = data;
    const engine = await this.getById(engine_id, account_id);
    return engine;
  }
}
