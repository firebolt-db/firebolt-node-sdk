import {
  ACCOUNT_ENGINE,
  ACCOUNT_ENGINES,
  ACCOUNT_DATABASE_BINDING_URL,
  ACCOUNT_BINDINGS_URL,
  ENGINES_BY_IDS_URL,
  ResultsPage
} from "../../../common/api";
import { ResourceManagerContextV1 } from "../../../types";
import { EngineModel } from "./model";
import { Engine, ID } from "./types";
import { CreateEngineOptions } from "../types";
import { DatabaseModel } from "../../database/v1/model";
import {
  getCheapestInstance,
  resolveEngineSpec,
  resolveRegionKey
} from "../../utils";
import { DatabaseService } from "../../database/v1";

export class EngineService {
  private readonly context: ResourceManagerContextV1;

  constructor(context: ResourceManagerContextV1) {
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

  private async getByIds(engineIds: string[]): Promise<EngineModel[]> {
    const { apiEndpoint, httpClient } = this.context;
    if (engineIds.length === 0) {
      return [];
    }
    const accountId = await this.accountId;
    const enginesPayload = JSON.stringify({
      engine_ids: engineIds.map(id => ({ engineId: id, accountId: accountId }))
    });
    const url = `${apiEndpoint}/${ENGINES_BY_IDS_URL}`;
    const data = await httpClient
      .request<{ engines: Engine[] }>("POST", url, { body: enginesPayload })
      .ready();
    return data.engines.map(engine => new EngineModel(this.context, engine));
  }

  async getByDB(database_name: string): Promise<EngineModel[]> {
    const { apiEndpoint, httpClient } = this.context;

    const databases = new DatabaseService(this.context);
    const database_id = (await databases.getByName(database_name)).id
      .database_id;
    const url = `${apiEndpoint}/${ACCOUNT_BINDINGS_URL(
      await this.accountId
    )}?filter.id_database_id_eq=${database_id}`;
    const data = await httpClient
      .request<{
        edges: [{ node: { id: { engine_id: string } } }];
      }>("GET", url)
      .ready();

    const engine_ids = data.edges.map(edge => edge.node.id.engine_id);
    return await this.getByIds(engine_ids);
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

  private warmupToString(name: string): string {
    const mapping: { [key: string]: string } = {
      MINIMAL: "ENGINE_SETTINGS_WARM_UP_MINIMAL",
      PRELOAD_INDEXES: "ENGINE_SETTINGS_WARM_UP_INDEXES",
      PRELOAD_ALL_DATA: "ENGINE_SETTINGS_WARM_UP_ALL"
    };
    return mapping[name] || name;
  }

  async create(
    name: string,
    options: CreateEngineOptions
  ): Promise<EngineModel> {
    const { apiEndpoint, httpClient } = this.context;
    if (!options || !("region" in options) || options.region === undefined) {
      throw new Error("region is required");
    }
    const region_key = await resolveRegionKey(
      options.region,
      apiEndpoint,
      httpClient
    );
    const instance_type_id =
      (options.spec &&
        (await resolveEngineSpec(
          options.spec,
          region_key.region_id,
          await this.accountId,
          apiEndpoint,
          httpClient
        ))) ||
      (await getCheapestInstance(
        region_key.region_id,
        await this.accountId,
        apiEndpoint,
        httpClient
      ));
    const enginePayload = JSON.stringify({
      account_id: await this.accountId,
      engine: {
        name: name,
        compute_region_id: region_key,
        settings: {
          ...(options.engine_type && { engine_type: options.engine_type }),
          ...(options.auto_stop && {
            auto_stop_delay_duration: `${options.auto_stop * 60}s`
          }),
          ...(options.warmup && {
            warm_up: this.warmupToString(options.warmup)
          })
        }
      },
      engine_revision: {
        specification: {
          db_compute_instances_type_id: instance_type_id,
          proxy_instances_type_id: instance_type_id,
          proxy_instances_count: 1,
          db_compute_instances_count: options.scale ?? 1
        }
      }
    });
    const url = `${apiEndpoint}/${ACCOUNT_ENGINES(await this.accountId)}`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url, { body: enginePayload })
      .ready();
    return new EngineModel(this.context, data.engine);
  }

  async attachToDatabase(
    engine: EngineModel | string,
    database: DatabaseModel | string
  ): Promise<void> {
    const { apiEndpoint, httpClient } = this.context;
    const engineId =
      typeof engine === "string"
        ? (await this.getEngineId(engine)).engine_id
        : engine.id.engine_id;
    const databases = new DatabaseService(this.context);
    const databaseId =
      typeof database === "string"
        ? (await databases.getByName(database)).id.database_id
        : database.id.database_id;
    const url = `${apiEndpoint}/${ACCOUNT_DATABASE_BINDING_URL(
      await this.accountId,
      databaseId,
      engineId
    )}`;
    const payload = JSON.stringify({
      binding: {
        id: {
          account_id: await this.accountId,
          database_id: databaseId,
          engine_id: engineId
        }
      }
    });
    await httpClient.request("POST", url, { body: payload }).ready();
  }
}
