// node entry point
import { FireboltClient, ResourceClient } from "./firebolt";
import { NodeHttpClient } from "./http/node";
import { Logger } from "./logger/node";

export const Firebolt = FireboltClient({
  logger: Logger,
  httpClient: NodeHttpClient
});

export const FireboltResourceManager = ResourceClient({
  logger: Logger,
  httpClient: NodeHttpClient
});

export type {
  FireboltClientOptions,
  ConnectionOptions,
  StreamOptions,
  ExecuteQueryOptions,
  ResponseSettings,
  RowParser,
  Statistics,
  QueryResponse,
  QuerySettings,
  Context,
  Row
} from "./types";

export { OutputFormat } from "./types";
export { EngineStatusSummary } from "./service/engine/types";
export { isDateType, isNumberType } from "./statement/dataTypes";
export {
  Tuple,
  PGDate,
  TimestampTZ,
  TimestampNTZ,
  QueryFormatter
} from "./formatter";

export { JSONParser } from "./statement/stream/parser";

export type { Connection } from "./connection";
export type { Meta } from "./meta";
