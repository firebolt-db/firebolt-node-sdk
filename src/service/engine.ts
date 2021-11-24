import { Context } from "../context";

export class EngineService {
  context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  async getByName(engineName: string) {
    const { httpClient } = this.context;
    return engineName;
  }

  async create(engineName: string) {}

  async start(engineName: string) {}
}
