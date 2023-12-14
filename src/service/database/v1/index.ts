import {
  ACCOUNT_DATABASES,
  ACCOUNT_DATABASE,
  ACCOUNT_ENGINE_URL_BY_DATABASE_NAME,
  ResultsPage
} from "../../../common/api";
import { ResourceManagerContext } from "../../../types";
import { DatabaseModel } from "./model";
import { ID, Database } from "./types";
import { CreateDatabaseOptions } from "../types";

export class DatabaseService {
  private readonly context: ResourceManagerContext;
  private readonly accountId: string;

  constructor(context: ResourceManagerContext, accountId: string) {
    this.context = context;
    this.accountId = accountId;
  }

  private async getDatabaseId(databaseName: string): Promise<ID> {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ database_name: databaseName });
    const url = `${apiEndpoint}/${ACCOUNT_DATABASES(
      this.accountId
    )}:getIdByName?${queryParams}`;
    const data = await httpClient
      .request<{ database_id: ID }>("GET", url)
      .ready();
    return data.database_id;
  }

  async getDefaultEndpointByName(name: string) {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ database_name: name });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_URL_BY_DATABASE_NAME(
      this.accountId
    )}?${queryParams}`;
    const data = await httpClient
      .request<{ engine_url: string }>("GET", url)
      .ready();
    return data.engine_url;
  }

  async getById(databaseId: string): Promise<DatabaseModel> {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ACCOUNT_DATABASE(
      this.accountId,
      databaseId
    )}`;
    const data = await httpClient
      .request<{ database: Database }>("GET", url)
      .ready();
    return new DatabaseModel(this.context, data.database, this.accountId);
  }

  async getByName(databaseName: string): Promise<DatabaseModel> {
    const { database_id } = await this.getDatabaseId(databaseName);
    const database = await this.getById(database_id);
    return new DatabaseModel(this.context, database, this.accountId);
  }

  async getAll(): Promise<DatabaseModel[]> {
    const databases: DatabaseModel[] = [];
    const { apiEndpoint, httpClient } = this.context;

    let hasNextPage = false;
    let cursor = "";
    do {
      const query = cursor
        ? `?${new URLSearchParams({ "page.after": cursor })}`
        : "";
      const url = `${apiEndpoint}/${ACCOUNT_DATABASES(this.accountId)}${query}`;
      const data = await httpClient
        .request<ResultsPage<Database>>("GET", url)
        .ready();

      hasNextPage = data.page.has_next_page;

      for (const edge of data.edges) {
        cursor = edge.cursor;
        databases.push(
          new DatabaseModel(this.context, edge.node, this.accountId)
        );
      }
    } while (hasNextPage);

    return databases;
  }

  async create(
    name: string,
    options: CreateDatabaseOptions
  ): Promise<DatabaseModel> {
    return await this.getByName(name);
  }
}
