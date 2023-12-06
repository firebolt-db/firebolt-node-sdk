import BigNumber from "bignumber.js";
import { HttpClientInterface, HttpClientOptions } from "./http";

import { LoggerInterface, LoggerOptions } from "./logger";
import { Meta } from "./meta";
import { QueryFormatter } from "./formatter";
import { Connection } from "./connection";

export type Statistics = {
  duration: number | BigNumber;
  scannedRows: number;
  scannedBytes: number;
  scannedBytesCache?: number;
  scannedBytesStorage?: number;
};

export type Row = Record<string, unknown> | unknown[];

export type QueryResponse = {
  meta: Meta[];
  statistics: Statistics | null;
  data: Row[];
};

export enum OutputFormat {
  // JSON_COMPACT_LIMITED = "FB_JSONCompactLimited",
  COMPACT = "JSON_Compact", // supported in v3 of packdb
  JSON_COMPACT = "JSONCompact", // to be as above, after ensure all clients has v3
  JSON = "JSON"
}

export type QuerySettings = Record<string, unknown> & {
  output_format?: OutputFormat;
};

export type RowParser = (row: string, isLastRow: boolean) => any;

export type ResponseSettings = {
  normalizeData?: boolean;
  bigNumberAsString?: boolean;
  hydrateRow?: (
    row: Row,
    meta: Meta[],
    executeQueryOptions: ExecuteQueryOptions
  ) => Row;
};

export type ExecuteQueryOptions = {
  settings?: QuerySettings;
  parameters?: unknown[];
  namedParameters?: Record<string, unknown>;
  response?: ResponseSettings;
};

export type StreamOptions = {
  rowParser?: RowParser;
};

export type ConnectorVersion = {
  name: string;
  version: string;
};

export type AdditionalConnectionParameters = {
  userDrivers?: ConnectorVersion[];
  userClients?: ConnectorVersion[];
};

export type UsernamePasswordAuth = {
  username: string;
  password: string;
};

export type ServiceAccountAuth = {
  client_id: string;
  client_secret: string;
};

export type AuthOptions = UsernamePasswordAuth | ServiceAccountAuth;

export type ConnectionOptions = {
  database?: string;
  engineName?: string;
  additionalParameters?: AdditionalConnectionParameters;
  account: string;
  auth: AuthOptions;
};

export type FireboltClientOptions = {
  logger?: LoggerOptions;
  client?: HttpClientOptions;
  apiEndpoint?: string;
  dependencies?: {
    logger: LoggerInterface;
    httpClient: HttpClientInterface;
  };
};

export type ResourceManagerOptions = {
  connection: Connection;
  logger?: LoggerOptions;
  dependencies?: {
    logger: LoggerInterface;
  };
};

export type Context = {
  logger: LoggerInterface;
  httpClient: HttpClientInterface;
  queryFormatter: QueryFormatter;
  apiEndpoint: string;
};

export type ResourceManagerContext = {
  logger: LoggerInterface;
  connection: Connection;
};
