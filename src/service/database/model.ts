import { DeprecationError } from "../../common/errors";
import { Database } from "./types";

export class DatabaseModel {
  name: string;
  description: string;

  constructor(database: Database) {
    const { name, description } = database;
    this.name = name;
    this.description = description;
  }

  async getDefaultEndpoint(): Promise<string> {
    throw new DeprecationError({
      message: "Default endpoint concept no longer exists for databases."
    });
  }
}
