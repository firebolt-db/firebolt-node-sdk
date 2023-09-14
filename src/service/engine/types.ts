export type Engine = {
  name: string;
  endpoint: string;
  current_status_summary: EngineStatusSummary;
};

export function processEngineStatus(
  value: string
): EngineStatusSummary | undefined {
  // Translate status from db to an EngineStatusSummary object
  const enumKey = Object.keys(EngineStatusSummary).find(
    key =>
      EngineStatusSummary[key as keyof typeof EngineStatusSummary] === value
  );
  if (enumKey !== undefined) {
    return EngineStatusSummary[enumKey as keyof typeof EngineStatusSummary];
  }
  return undefined;
}

export enum EngineStatusSummary {
  DELETING = "Dropping",
  REPAIRING = "Repairing",
  RUNNING = "Running",
  STARTING = "Starting",
  STARTING_INITIALIZING = "Started",
  STOPPED = "Stopped",
  STOPPING = "Stopping"
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
}
