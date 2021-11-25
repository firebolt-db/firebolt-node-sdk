import { Context } from "../context";
import { ENGINE_ID_BY_NAME } from "../common/api";

export class EngineService {
  context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  private async getEngineId(engineName: string) {
    const { httpClient, apiUrl } = this.context;
    const queryParams = new URLSearchParams({ engine_name: engineName });
    const path = `https://${apiUrl}/${ENGINE_ID_BY_NAME}?${queryParams}`;
    const response = await httpClient.request("GET", path);
    return response.engine_id;
  }

  async getById(engineId: string, accountId: string) {
    const { httpClient, apiUrl } = this.context;
    const path = `https://${apiUrl}/core/v1/accounts/${accountId}/engines/${engineId}`;
    const { engine } = await httpClient.request("GET", path);
    return engine;
  }

  async getByName(engineName: string) {
    const { engine_id, account_id } = await this.getEngineId(engineName);
    const engine = await this.getById(engine_id, account_id);
    return engine;
  }

  async create(engineName: string) {}

  async start(engineName: string) {}
}
