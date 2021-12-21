import { ENGINES } from "../../common/api";
import { Context } from "../../types";
import { ID, Engine } from "./types";

export class EngineModel {
  private context: Context;
  id: ID;
  name: string;
  endpoint: string;
  current_status_summary: string;

  constructor(context: Context, engine: Engine) {
    const { id, name, endpoint, current_status_summary } = engine;
    this.id = id;
    this.name = name;
    this.endpoint = endpoint;
    this.context = context;
    this.current_status_summary = current_status_summary;
  }

  async start() {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ENGINES}/${this.id}:start`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async stop() {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ENGINES}/${this.id}:stop`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async restart() {
    const { apiEndpoint, httpClient } = this.context;
    const url = `${apiEndpoint}/${ENGINES}/${this.id}:restart`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }
}
