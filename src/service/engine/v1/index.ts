import {
  ACCOUNT_ENGINE,
  ACCOUNT_ENGINES,
  ResultsPage
} from "../../../common/api";
import { ResourceManagerContext } from "../../../types";
import { EngineModel } from "./model";
import { Engine, EngineStatusSummary, ID } from "./types";
import { CreateEngineOptions } from "../types";
import { DatabaseModel } from "../../database/v1/model";

export class EngineService {
  private readonly context: ResourceManagerContext;

  constructor(context: ResourceManagerContext) {
    this.context = context;
  }

  private get accountId(): Promise<string> {
    return this.context.connection.resolveAccountId();
  }

  private async getEngineId(engineName: string): Promise<ID> {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ engine_name: engineName });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINES(
      await this.accountId
    )}:getIdByName?${queryParams}`;
    const data = await httpClient
      .request<{ engine_id: ID }>("GET", url)
      .ready();
    return data.engine_id;
  }

  async getById(engineId: string): Promise<EngineModel> {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE(
      await this.accountId,
      engineId
    )}`;
    const data = await httpClient
      .request<{ engine: Engine }>("GET", url)
      .ready();
    return new EngineModel(this.context, data.engine);
  }

  async getByDB(database_name: string): Promise<EngineModel[]> {
    return [];
  }

  async getByName(engineName: string): Promise<EngineModel> {
    const { engine_id } = await this.getEngineId(engineName);
    return await this.getById(engine_id);
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
      const url = `${apiEndpoint}/${ACCOUNT_ENGINES(
        await this.accountId
      )}${query}`;
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

  async create(
    name: string,
    options: CreateEngineOptions
  ): Promise<EngineModel> {
    // TODO: Implement
    return new EngineModel(this.context, {
      id: {
        account_id: "",
        engine_id: ""
      },
      name: "",
      description: "",
      endpoint: "",
      current_status_summary: EngineStatusSummary.DELETED
    });
  }

  async attachToDatabase(
    engine: EngineModel | string,
    database: DatabaseModel | string
  ): Promise<void> {
    // TODO: Implement
  }
}
