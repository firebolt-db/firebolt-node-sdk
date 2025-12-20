// node entry point
import { FireboltClient, ResourceClient } from "./firebolt";
import { NodeHttpClient } from "./http/node";
import { Logger } from "./logger/node";
import type { FireboltCoreAuth } from "./types";

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
  Row,
  FireboltCoreAuth
} from "./types";

export const FireboltCore = (): FireboltCoreAuth => ({
  type: "firebolt-core"
});

export { OutputFormat } from "./types";
export { EngineStatusSummary } from "./service/engine/types";
export { isDateType, isNumberType } from "./statement/dataTypes";
export {
  Tuple,
  PGDate,
  TimestampTZ,
  TimestampNTZ,
  QueryFormatter
} from "./formatter/base";

export type { Connection } from "./connection";
export type { Meta } from "./meta";
