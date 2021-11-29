import BigNumber from "bignumber.js";

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

export type QueryResponse = {
  meta: Meta[];
  statistics: Statistics | null;
  data: Record<string, unknown>[];
};

export enum OutputFormat {
  JSON_COMPACT_LIMITED = "FB_JSONCompactLimited",
  JSON_COMPACT = "FB_JSONCompact",
  JSON = "JSON"
}

export type QuerySettings = {
  output_format?: OutputFormat;
};
