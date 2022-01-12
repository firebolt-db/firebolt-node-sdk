import { DATABASES, ACCOUNTS, ResultsPage } from "../../common/api";
import { Context } from "../../types";
import { DatabaseModel } from "./model";
import { ID, Database } from "./types";

export class DatabaseService {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  private async getDatabaseId(databaseName: string): Promise<ID> {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ database_name: databaseName });
    const url = `${apiEndpoint}/${DATABASES}:getIdByName?${queryParams}`;
    const data = await httpClient
      .request<{ database_id: ID }>("GET", url)
      .ready();
    return data.database_id;
  }

  async getById(databaseId: string, accountId: string): Promise<DatabaseModel> {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ACCOUNTS}/${accountId}/databases/${databaseId}`;
    const data = await httpClient
      .request<{ database: Database }>("GET", url)
      .ready();
    return new DatabaseModel(this.context, data.database);
  }

  async getByName(databaseName: string): Promise<DatabaseModel> {
    const { database_id, account_id } = await this.getDatabaseId(databaseName);
    const database = await this.getById(database_id, account_id);
    return new DatabaseModel(this.context, database);
  }

  async getAll(): Promise<DatabaseModel[]> {
    const databases: DatabaseModel[] = [];
    const { apiEndpoint, httpClient } = this.context;
    
    let hasNextPage = false;
    let cursor: string;
    do {
      // I don't know where to add the cursor to request the next page.
      const url = `${apiEndpoint}/${DATABASES}`;
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

}
