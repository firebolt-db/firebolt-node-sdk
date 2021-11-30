import { Context } from "../context";
import { ENGINE_ID_BY_NAME, ACCOUNTS } from "../common/api";

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
    const { engine_id } = await httpClient.request<{ engine_id: EngineId }>(
      "GET",
      url
    );
    return engine_id;
  }

  async getById(engineId: string, accountId: string) {
    const { httpClient, apiUrl } = this.context;
    const url = `${apiUrl}/${ACCOUNTS}/${accountId}/engines/${engineId}`;
    const { engine } = await httpClient.request<{ engine: Engine }>("GET", url);
    return engine;
  }

  async getByName(engineName: string) {
    const { engine_id, account_id } = await this.getEngineId(engineName);
    const engine = await this.getById(engine_id, account_id);
    return engine;
  }
}
