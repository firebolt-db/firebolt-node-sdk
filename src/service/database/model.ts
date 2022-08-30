import { ACCOUNT_ENGINE_URL_BY_DATABASE_NAME } from "../../common/api";
import { Context } from "../../types";
import { ID, Database } from "./types";

export class DatabaseModel {
  private context: Context;
  id: ID;
  name: string;
  description: string;

  constructor(context: Context, database: Database) {
    const { id, name, description } = database;
    this.id = id;
    this.name = name;
    this.description = description;
    this.context = context;
  }

  async getDefaultEndpoint(): Promise<string> {
    const { apiEndpoint, httpClient } = this.context;
    const accountId = this.context.resourceManager.account.id;
    const queryParams = new URLSearchParams({ database_name: this.name });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_URL_BY_DATABASE_NAME(
      accountId
    )}?${queryParams}`;
    const data = await httpClient
      .request<{ engine_url: string }>("GET", url)
      .ready();
    return data.engine_url;
  }
}
