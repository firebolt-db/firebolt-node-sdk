import { Context } from "../../types";
import { Database } from "./types";

// TODO: re-add description
export class DatabaseModel {
  private context: Context;
  name: string;

  constructor(context: Context, database: Database) {
    const { name } = database;
    this.name = name;
    this.context = context;
  }

  async getDefaultEndpoint(): Promise<string> {
    throw new Error("Default endpoint concept no longer exists for databases.");
  }
}
