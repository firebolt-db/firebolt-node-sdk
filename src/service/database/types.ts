import { EngineModel } from "../engine/model";

export type Database = {
  name: string;
  description: string;
};

export type CreateDatabaseOptions = {
  region?: string;
  attached_engines?: string[] | EngineModel[];
  description?: string;
  fail_if_exists?: boolean;
}