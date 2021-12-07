import BigNumber from "bignumber.js";
import { Parameter } from "./paramter";
import { HttpClientInterface } from "./http";
import { LoggerInterface } from "./logger";
import { ResourceManager } from "./service";

export type Statistics = {
  duration: number | BigNumber;
  scannedRows: number;
  scannedBytes: number;
  scannedBytesCache?: number;
  scannedBytesStorage?: number;
};

export type Meta = {
  name: string;
  type: string;
};

export type Row = Record<string, unknown> | unknown[];

export type QueryResponse = {
  meta: Meta[];
  statistics: Statistics | null;
  data: Row[];
};

export enum OutputFormat {
  JSON_COMPACT_LIMITED = "FB_JSONCompactLimited",
  JSON_COMPACT = "JSONCompact",
  JSON = "JSON"
}

export type QuerySettings = {
  output_format?: OutputFormat;
};

export type ResponseSettings = {
  normalizeData?: boolean;
};

export type ExecuteQueryOptions = {
  settings?: QuerySettings;
  paramters?: Parameter[];
  response?: ResponseSettings;
};

export type Context = {
  logger: LoggerInterface;
  httpClient: HttpClientInterface;
  resourceManager: ResourceManager;
  apiUrl: string;
};
