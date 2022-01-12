// node entry point
import { FireboltClient } from "./firebolt";
import { NodeHttpClient } from "./http/node";
import { Logger } from "./logger/node";

export const Firebolt = FireboltClient({
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
  Meta,
  OutputFormat,
  QueryResponse,
  QuerySettings,
  Context,
  Row
} from "./types";

export type { Connection } from "./connection";
