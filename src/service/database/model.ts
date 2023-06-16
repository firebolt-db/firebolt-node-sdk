import { DeprecationError } from "../../common/errors";
import { Context } from "../../types";
import { Database } from "./types";

export class DatabaseModel {
  private context: Context;
  name: string;
  description: string;

  constructor(context: Context, database: Database) {
    const { name, description } = database;
    this.name = name;
    this.description = description;
    this.context = context;
  }

  async getDefaultEndpoint(): Promise<string> {
    throw new DeprecationError({
      message: "Default endpoint concept no longer exists for databases."
    });
  }
}
