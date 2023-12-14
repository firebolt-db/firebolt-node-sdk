import { EngineModel } from "../engine/model";

export type Database = {
  id?: string;
  name: string;
  description: string;
};

export type CreateDatabaseOptions = {
  region?: string;
  attached_engines?: string[] | EngineModel[];
  description?: string;
  fail_if_exists?: boolean;
};

export interface DatabaseModelInterface {
  name: string;
  description: string;
  delete(): Promise<void>;
}

export interface DatabaseServiceInterface {
  getByName(name: string): Promise<DatabaseModelInterface>;
  getAll(): Promise<DatabaseModelInterface[]>;
  create(
    name: string,
    options: CreateDatabaseOptions
  ): Promise<DatabaseModelInterface>;
}
