export type ID = { engine_id: string; account_id: string };

export type Engine = {
  id: ID;
  name: string;
  description: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;
};

export enum EngineStatusSummary {
  DELETED = "DELETED",
  DELETING = "DELETING",
  FAILED = "FAILED",
  REPAIRING = "REPAIRING",
  RESTARTING = "RESTARTING",
  RESTARTING_INITIALIZING = "RESTARTING_INITIALIZING",
  RUNNING = "RUNNING",
  STARTING = "STARTING",
  STARTING_INITIALIZING = "STARTING_INITIALIZING",
  STOPPED = "STOPPED",
  STOPPING = "STOPPING",
  UNSPECIFIED = "UNSPECIFIED",
  UPGRADING = "UPGRADING"
}
