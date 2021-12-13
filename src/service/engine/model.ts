import { ENGINES } from "../../common/api";
import { Context } from "../../types";
import { ID, Engine } from "./types";

export class EngineModel {
  context: Context;
  id: ID;
  name: string;
  endpoint: string;

  constructor(context: Context, engine: Engine) {
    const { id, name, endpoint } = engine;
    this.id = id;
    this.name = name;
    this.endpoint = endpoint;
    this.context = context;
  }

  async start() {
    const { apiUrl, httpClient } = this.context;
    const url = `${apiUrl}/${ENGINES}/${this.id}:start`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async stop() {
    const { apiUrl, httpClient } = this.context;
    const url = `${apiUrl}/${ENGINES}/${this.id}:stop`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }

  async restart() {
    const { apiUrl, httpClient } = this.context;
    const url = `${apiUrl}/${ENGINES}/${this.id}:restart`;
    const data = await httpClient
      .request<{ engine: Engine }>("POST", url)
      .ready();
    return data;
  }
}
