import {
  ACCOUNT_ENGINE_URL_BY_DATABASE_NAME,
  ACCOUNT_DATABASE
} from "../../../common/api";
import { ResourceManagerContext } from "../../../types";
import { ID, Database } from "./types";
import { ResourceManager } from "../../index";

export class DatabaseModel {
  private readonly context: ResourceManagerContext;
  id: ID;
  name: string;
  description: string;

  constructor(context: ResourceManagerContext, database: Database) {
    const { id, name, description } = database;
    this.id = id;
    this.name = name;
    this.description = description;
    this.context = context;
  }

  private get accountId(): Promise<string> {
    return this.context.connection.resolveAccountId();
  }

  async getDefaultEndpoint(): Promise<string> {
    const { apiEndpoint, httpClient } = this.context;
    const queryParams = new URLSearchParams({ database_name: this.name });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINE_URL_BY_DATABASE_NAME(
      await this.accountId
    )}?${queryParams}`;
    const data = await httpClient
      .request<{ engine_url: string }>("GET", url)
      .ready();
    return data.engine_url;
  }

  async getAttachedEngines() {
    const resourceManager = new ResourceManager(this.context);
    return resourceManager.engine.getByDB(this.name);
  }

  async delete() {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ACCOUNT_DATABASE(
      await this.accountId,
      this.id.database_id
    )}`;
    await httpClient.request("DELETE", url).ready();
  }
}
