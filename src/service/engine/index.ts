import { ACCOUNT_ENGINE, ACCOUNT_ENGINES, ResultsPage } from "../../common/api";
import { Context } from "../../types";
import { EngineModel } from "./model";
import { ID, Engine } from "./types";

export class EngineService {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  private async getEngineId(engineName: string): Promise<ID> {
    const { apiEndpoint, httpClient } = this.context;
    const accountId = this.context.resourceManager.account.id;
    const queryParams = new URLSearchParams({ engine_name: engineName });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINES(
      accountId
    )}:getIdByName?${queryParams}`;
    const data = await httpClient
      .request<{ engine_id: ID }>("GET", url)
      .ready();
    return data.engine_id;
  }

  async getById(engineId: string): Promise<EngineModel> {
    const { apiEndpoint, httpClient } = this.context;
    const accountId = this.context.resourceManager.account.id;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE(accountId, engineId)}`;
    const data = await httpClient
      .request<{ engine: Engine }>("GET", url)
      .ready();
    return new EngineModel(this.context, data.engine);
  }

  async getByName(engineName: string): Promise<EngineModel> {
    const { engine_id } = await this.getEngineId(engineName);
    const engine = await this.getById(engine_id);
    return new EngineModel(this.context, engine);
  }

  async getAll(): Promise<EngineModel[]> {
    const engines: EngineModel[] = [];
    const { apiEndpoint, httpClient } = this.context;
    const accountId = this.context.resourceManager.account.id;

    let hasNextPage = false;
    let cursor = "";
    do {
      const query = cursor
        ? `?${new URLSearchParams({ "page.after": cursor })}`
        : "";
      const url = `${apiEndpoint}/${ACCOUNT_ENGINES(accountId)}${query}`;
      const data = await httpClient
        .request<ResultsPage<Engine>>("GET", url)
        .ready();

      hasNextPage = data.page.has_next_page;

      for (const edge of data.edges) {
        cursor = edge.cursor;
        engines.push(new EngineModel(this.context, edge.node));
      }
    } while (hasNextPage);

    return engines;
  }
}
