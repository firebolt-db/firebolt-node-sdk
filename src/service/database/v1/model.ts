import { ACCOUNT_ENGINE_URL_BY_DATABASE_NAME } from "../../../common/api";
import { ResourceManagerContext } from "../../../types";
import { ID, Database } from "./types";

export class DatabaseModel {
  private context: ResourceManagerContext;
  private accountId: string;
  id: ID;
  name: string;
  description: string;

  constructor(
    context: ResourceManagerContext,
    database: Database,
    accountId: string
  ) {
    const { id, name, description } = database;
    this.id = id;
    this.name = name;
    this.description = description;
    this.context = context;
    this.accountId = accountId;
  }

  async getDefaultEndpoint(): Promise<string> {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ database_name: this.name });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_URL_BY_DATABASE_NAME(
      this.accountId
    )}?${queryParams}`;
    const data = await httpClient
      .request<{ engine_url: string }>("GET", url)
      .ready();
    return data.engine_url;
  }
}
