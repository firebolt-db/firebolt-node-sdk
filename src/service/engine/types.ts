import { DatabaseModelInterface } from "../database/types";
import {
  Engine as EngineV1,
  EngineStatusSummary as EngineStatusSummaryV1
} from "./v1/types";

export type Engine = {
  name: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;
};

export function processEngineStatus(
  value: string | undefined
): EngineStatusSummary | undefined {
  // Translate status from db to an EngineStatusSummary object
  if (value === undefined) {
    return undefined;
  }
  const enumKey = Object.keys(EngineStatusSummary).find(
    key =>
      EngineStatusSummary[
        key as keyof typeof EngineStatusSummary
      ].toLowerCase() === value.toLowerCase()
  );
  if (enumKey !== undefined) {
    return EngineStatusSummary[enumKey as keyof typeof EngineStatusSummary];
  }
  return undefined;
}

export enum EngineStatusSummary {
  STARTING = "Starting",
  RUNNING = "Running",
  RESIZING = "Resizing",
  DRAINING = "Draining",
  STOPPED = "Stopped",
  STOPPING = "Stopping",
  // Specific for V1, here are just for typing match
  DELETED = "ENGINE_STATUS_SUMMARY_DELETED",
  FAILED = "ENGINE_STATUS_SUMMARY_FAILED",
  RESTARTING = "ENGINE_STATUS_SUMMARY_RESTARTING",
  RESTARTING_INITIALIZING = "ENGINE_STATUS_SUMMARY_RESTARTING_INITIALIZING",
  UNSPECIFIED = "ENGINE_STATUS_SUMMARY_UNSPECIFIED",
  UPGRADING = "ENGINE_STATUS_SUMMARY_UPGRADING",
  REPAIRING = "ENGINE_STATUS_SUMMARY_REPAIRING",
  STARTING_INITIALIZING = "ENGINE_STATUS_SUMMARY_STARTING_INITIALIZING"
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
  current_status_summary: EngineStatusSummary | EngineStatusSummaryV1;
  start(): Promise<{ engine: Engine | EngineV1 }>;
  startAndWait(): Promise<{ engine: Engine | EngineV1 }>;
  stop(): Promise<{ engine: Engine | EngineV1 }>;
  restart(): Promise<{ engine: Engine | EngineV1 }>;
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
