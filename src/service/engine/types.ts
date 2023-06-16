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
