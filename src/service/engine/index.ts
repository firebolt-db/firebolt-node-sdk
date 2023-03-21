import { ACCOUNT_ENGINE, ACCOUNT_ENGINES, ResultsPage } from "../../common/api";
import { AccessError } from "../../common/errors";
import { Statement } from "../../statement";
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

  private async isDatabaseAccessible(databaseName: string): Promise<boolean> {
    const { httpClient } = this.context;
    const systemUrl =
      await this.context.resourceManager.database.getSytemEngineEndpoint();
    const body =
      "SELECT database_name FROM information_schema.databases " +
      `WHERE database_name='${databaseName}'`;
    const request = httpClient.request<unknown>("POST", systemUrl, {
      body,
      raw: true
    });
    await request.ready();
    const statement = new Statement(this.context, {
      query: body,
      request,
      executeQueryOptions: {}
    });
    const { data } = await statement.fetchResult();
    return data.length == 1;
  }

  public async getEngineDatabase(engineName: string): Promise<string> {
    const { httpClient } = this.context;
    const systemUrl =
      await this.context.resourceManager.database.getSytemEngineEndpoint();
    const body =
      "SELECT attached_to FROM information_schema.engines " +
      `WHERE engine_name='${engineName}'`;
    const request = httpClient.request<unknown>("POST", systemUrl, {
      body,
      raw: true
    });
    await request.ready();
    const statement = new Statement(this.context, {
      query: body,
      request,
      executeQueryOptions: {}
    });
    const { data } = await statement.fetchResult();
    const res = data[0] as Record<string, string>;
    return res.attached_to;
  }

  private async getEngineUrl(
    engineName: string,
    databaseName: string
  ): Promise<string> {
    const { httpClient } = this.context;
    const systemUrl =
      await this.context.resourceManager.database.getSytemEngineEndpoint();
    const body =
      "SELECT engs.engine_url, engs.attached_to, dbs.database_name, status " +
      "FROM information_schema.engines as engs " +
      "LEFT JOIN information_schema.databases as dbs " +
      "ON engs.attached_to = dbs.database_name " +
      `WHERE engs.engine_name = '${engineName}'`;
    const request = httpClient.request<unknown>("POST", systemUrl, {
      body,
      raw: true
    });
    await request.ready();
    const statement = new Statement(this.context, {
      query: body,
      request,
      executeQueryOptions: {}
    });
    const { data } = await statement.fetchResult();
    if (data.length == 0) {
      throw new Error(`Engine ${engineName} not found.`);
    }
    const filteredRows = [];
    for (const row of data) {
      if ((row as Record<string, string>).database_name == databaseName) {
        filteredRows.push(row);
      }
    }
    if (filteredRows.length == 0) {
      throw new Error(
        `Engine ${engineName} is not attached to ${databaseName}.`
      );
    }
    if (filteredRows.length > 1) {
      throw new Error(
        `Unexpected duplicate entries found for ${engineName} and database ${databaseName}`
      );
    }
    if ((filteredRows[0] as Record<string, string>).status != "RUNNING") {
      throw new Error(`Engine ${engineName} is not running`);
    }
    return (filteredRows[0] as Record<string, string>).engine_url;
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

  async getByNameAndDb(engineName: string, database: string): Promise<string> {
    // Verify user has access to the db
    // Probably migrate it to database module
    const haveAccess = await this.isDatabaseAccessible(database);
    if (!haveAccess) {
      throw new AccessError({
        message: `Database ${database} does not exist or current user has no access to it.`
      });
    }
    // Fetch engine url
    const engineUrl = await this.getEngineUrl(engineName, database);
    return engineUrl;
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
