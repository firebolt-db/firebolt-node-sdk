import {
  ACCOUNT_DATABASES,
  ACCOUNT_DATABASE,
  ACCOUNT_ENGINE_URL_BY_DATABASE_NAME,
  ResultsPage
} from "../../../common/api";
import { ResourceManagerContextV1 } from "../../../types";
import { DatabaseModel } from "./model";
import { ID, Database } from "./types";
import { CreateDatabaseOptions } from "../types";
import { resolveRegionKey } from "../../utils";
import { ResourceManager } from "../../index";
export class DatabaseService {
  private readonly context: ResourceManagerContextV1;

  constructor(context: ResourceManagerContextV1) {
    this.context = context;
  }

  private get accountId(): Promise<string> {
    return this.context.connection.resolveAccountId();
  }

  private async getDatabaseId(databaseName: string): Promise<ID> {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ database_name: databaseName });
    const url = `${apiEndpoint}/${ACCOUNT_DATABASES(
      await this.accountId
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
      await this.accountId
    )}?${queryParams}`;
    const data = await httpClient
      .request<{ engine_url: string }>("GET", url)
      .ready();
    return data.engine_url;
  }

  async getById(databaseId: string): Promise<DatabaseModel> {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ACCOUNT_DATABASE(
      await this.accountId,
      databaseId
    )}`;
    const data = await httpClient
      .request<{ database: Database }>("GET", url)
      .ready();
    return new DatabaseModel(this.context, data.database);
  }

  async getByName(databaseName: string): Promise<DatabaseModel> {
    const { database_id } = await this.getDatabaseId(databaseName);
    const database = await this.getById(database_id);
    return new DatabaseModel(this.context, database);
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
      const url = `${apiEndpoint}/${ACCOUNT_DATABASES(
        await this.accountId
      )}${query}`;
      const data = await httpClient
        .request<ResultsPage<Database>>("GET", url)
        .ready();

      hasNextPage = data.page.has_next_page;

      for (const edge of data.edges) {
        cursor = edge.cursor;
        databases.push(new DatabaseModel(this.context, edge.node));
      }
    } while (hasNextPage);

    return databases;
  }

  async create(
    name: string,
    options: CreateDatabaseOptions
  ): Promise<DatabaseModel> {
    const { apiEndpoint, httpClient } = this.context;
    if (options.region === undefined) {
      throw new Error("Region is required");
    }
    const databasePayload = JSON.stringify({
      account_id: await this.accountId,
      database: {
        name: name,
        description: options.description,
        compute_region_id: await resolveRegionKey(
          options.region,
          apiEndpoint,
          httpClient
        )
      }
    });
    const url = `${apiEndpoint}/${ACCOUNT_DATABASES(await this.accountId)}`;
    const data = await httpClient
      .request<{ database: Database }>("POST", url, { body: databasePayload })
      .ready();

    const database = new DatabaseModel(this.context, data.database);
    if (options.attached_engines) {
      const resourceManager = new ResourceManager(this.context);
      for (const engine in options.attached_engines) {
        await resourceManager.engine.attachToDatabase(engine, database);
      }
    }
    return database;
  }
}
