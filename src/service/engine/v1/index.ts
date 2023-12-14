import {
  ACCOUNT_ENGINE,
  ACCOUNT_ENGINES,
  ResultsPage
} from "../../../common/api";
import { ResourceManagerContext } from "../../../types";
import { EngineModel } from "./model";
import { ID, Engine } from "./types";
import { CreateEngineOptions } from "../types";
import { DatabaseModel } from "../../database/v1/model";

export class EngineService {
  private readonly context: ResourceManagerContext;
  private readonly accountId: string;

  constructor(context: ResourceManagerContext, accountId: string) {
    this.context = context;
    this.accountId = accountId;
  }

  private async getEngineId(engineName: string): Promise<ID> {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ engine_name: engineName });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINES(
      this.accountId
    )}:getIdByName?${queryParams}`;
    const data = await httpClient
      .request<{ engine_id: ID }>("GET", url)
      .ready();
    return data.engine_id;
  }

  async getById(engineId: string): Promise<EngineModel> {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE(this.accountId, engineId)}`;
    const data = await httpClient
      .request<{ engine: Engine }>("GET", url)
      .ready();
    return new EngineModel(this.context, data.engine, this.accountId);
  }

  async getByDB(database_name: string): Promise<EngineModel[]> {
    return [];
  }

  async getByName(engineName: string): Promise<EngineModel> {
    const { engine_id } = await this.getEngineId(engineName);
    const engine = await this.getById(engine_id);
    return new EngineModel(this.context, engine, this.accountId);
  }

  async getAll(): Promise<EngineModel[]> {
    const engines: EngineModel[] = [];
    const { apiEndpoint, httpClient } = this.context;

    let hasNextPage = false;
    let cursor = "";
    do {
      const query = cursor
        ? `?${new URLSearchParams({ "page.after": cursor })}`
        : "";
      const url = `${apiEndpoint}/${ACCOUNT_ENGINES(this.accountId)}${query}`;
      const data = await httpClient
        .request<ResultsPage<Engine>>("GET", url)
        .ready();

      hasNextPage = data.page.has_next_page;

      for (const edge of data.edges) {
        cursor = edge.cursor;
        engines.push(new EngineModel(this.context, edge.node, this.accountId));
      }
    } while (hasNextPage);

    return engines;
  }

  async create(
    name: string,
    options: CreateEngineOptions
  ): Promise<EngineModel> {
    return new EngineModel(this.context, {}, this.accountId);
  }

  async attachToDatabase(
    engine: EngineModel | string,
    database: DatabaseModel | string
  ): Promise<void> {}
}
