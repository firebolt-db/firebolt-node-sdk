import { EngineModel } from "../engine/model";
import { EngineModelInterface } from "../engine/types";

export type Database = {
  id?: string;
  name: string;
  description: string;
};

export type CreateDatabaseOptions = {
  region?: string;
  attached_engines?: string[] | EngineModelInterface[];
  description?: string;
  fail_if_exists?: boolean;
};

export interface DatabaseModelInterface {
  name: string;
  description: string;
  delete(): Promise<void>;
  getAttachedEngines(): Promise<EngineModelInterface[]>;
}

export interface DatabaseServiceInterface {
  getById(databaseId: string): Promise<DatabaseModelInterface>;
  getByName(name: string): Promise<DatabaseModelInterface>;
  getAll(): Promise<DatabaseModelInterface[]>;
  create(
    name: string,
    options: CreateDatabaseOptions
  ): Promise<DatabaseModelInterface>;
  getDefaultEndpointByName(name: string): Promise<string>;
}
