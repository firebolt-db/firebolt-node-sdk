import { DatabaseModelInterface } from "../database/types";

export type Engine = {
  name: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;
};

export function processEngineStatus(
  value: string,
  engineName: string
): EngineStatusSummary {
  // Translate status from db to an EngineStatusSummary object
  const enumKey = Object.keys(EngineStatusSummary).find(
    key =>
      EngineStatusSummary[
        key as keyof typeof EngineStatusSummary
      ].toLowerCase() === value.toLowerCase()
  );
  if (enumKey !== undefined) {
    return EngineStatusSummary[enumKey as keyof typeof EngineStatusSummary];
  }
  throw new Error(`Engine ${engineName} has an unexpected status ${value}`);
}

export enum EngineStatusSummary {
  DELETING = "Dropping",
  REPAIRING = "Repairing",
  RUNNING = "Running",
  STARTING = "Starting",
  STARTING_INITIALIZING = "Started",
  STOPPED = "Stopped",
  STOPPING = "Stopping",
  // Specific for V1, here are just for typing match
  DELETED = "ENGINE_STATUS_SUMMARY_DELETED",
  FAILED = "ENGINE_STATUS_SUMMARY_FAILED",
  RESTARTING = "ENGINE_STATUS_SUMMARY_RESTARTING",
  RESTARTING_INITIALIZING = "ENGINE_STATUS_SUMMARY_RESTARTING_INITIALIZING",
  UNSPECIFIED = "ENGINE_STATUS_SUMMARY_UNSPECIFIED",
  UPGRADING = "ENGINE_STATUS_SUMMARY_UPGRADING"
}

export enum EngineType {
  GENERAL_PURPOSE = "GENERAL_PURPOSE",
  DATA_ANALYTICS = "DATA_ANALYTICS"
}

export enum WarmupMethod {
  MINIMAL = "MINIMAL",
  PRELOAD_INDEXES = "PRELOAD_INDEXES",
  PRELOAD_ALL_DATA = "PRELOAD_ALL_DATA"
}

export type CreateEngineOptions = {
  region?: string;
  engine_type?: string | EngineType;
  spec?: string;
  scale?: number;
  auto_stop?: number;
  warmup?: string | WarmupMethod;
  fail_if_exists?: boolean;
  initially_stopped?: boolean;
};

export interface EngineModelInterface {
  name: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;
  start(): Promise<{ engine: Engine }>;
  startAndWait(): Promise<{ engine: Engine }>;
  stop(): Promise<{ engine: Engine }>;
  restart(): Promise<{ engine: Engine }>;
  delete(): Promise<void>;
}

export interface EngineServiceInterface {
  getByName(name: string): Promise<EngineModelInterface>;
  getAll(): Promise<EngineModelInterface[]>;
  getByDB(database_name: string): Promise<EngineModelInterface[]>;
  create(
    name: string,
    options?: CreateEngineOptions
  ): Promise<EngineModelInterface>;
  attachToDatabase(
    engine: EngineModelInterface | string,
    database: DatabaseModelInterface | string
  ): Promise<void>;
}
