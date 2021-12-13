import { ENGINES, ACCOUNTS } from "../../common/api";
import { Context } from "../../types";
import { EngineModel } from "./model";
import { ID, Engine } from "./types";

export class EngineService {
  context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  private async getEngineId(engineName: string) {
    const { apiUrl, httpClient } = this.context;
    const queryParams = new URLSearchParams({ engine_name: engineName });
    const url = `${apiUrl}/${ENGINES}:getIdByName?${queryParams}`;
    const data = await httpClient
      .request<{ engine_id: ID }>("GET", url)
      .ready();
    return data.engine_id;
  }

  async getById(engineId: string, accountId: string) {
    const { apiUrl, httpClient } = this.context;
    const url = `${apiUrl}/${ACCOUNTS}/${accountId}/engines/${engineId}`;
    const data = await httpClient
      .request<{ engine: Engine }>("GET", url)
      .ready();
    return new EngineModel(this.context, data.engine);
  }

  async getByName(engineName: string) {
    const { engine_id, account_id } = await this.getEngineId(engineName);
    const engine = await this.getById(engine_id, account_id);
    return new EngineModel(this.context, engine);
  }
}
