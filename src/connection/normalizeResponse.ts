import {
  QueryResponse,
  QuerySettings,
  Meta,
  OutputFormat,
  ExecuteQueryOptions
} from "./types";

type ParsedResponse = {
  data: any;
  statistics: any;
  meta: any;
};

const getNormalizedData = (
  response: ParsedResponse,
  settings: QuerySettings
) => {
  if (!response.data) {
    return [];
  }
  const { data, meta } = response;

  const rows = [];
  for (const item of data) {
    const row: Record<string, unknown> = {};

    for (const index in meta) {
      const { name } = meta[index];

      if (settings.output_format === OutputFormat.JSON) {
        row[name] = item[name];
      }

      if (
        settings.output_format === OutputFormat.JSON_COMPACT ||
        settings.output_format === OutputFormat.JSON_COMPACT_LIMITED ||
        !settings.output_format
      ) {
        row[name] = item[index];
      }
    }
    rows.push(row);
  }
  return rows;
};

const getNormalizedMeta = (response: ParsedResponse): Meta[] => {
  if (!response.meta) {
    return [];
  }
  return response.meta;
};

const getNormalizedStatistics = (response: ParsedResponse) => {
  if (response.statistics) {
    const {
      elapsed,
      rows_read,
      bytes_read,
      scanned_bytes_cache,
      scanned_bytes_storage
    } = response.statistics;

    return {
      duration: elapsed,
      scannedRows: rows_read,
      scannedBytes: bytes_read,
      scannedBytesCache: scanned_bytes_cache,
      scannedBytesStorage: scanned_bytes_storage
    };
  }
  return null;
};

export const normalizeResponse = (
  response: ParsedResponse,
  executeQueryOptions: ExecuteQueryOptions
): QueryResponse => {
  const querySettings = executeQueryOptions.settings || {};
  const normalizeData = executeQueryOptions.response?.normalizeData;

  const data = normalizeData
    ? getNormalizedData(response, querySettings)
    : response.data;

  return {
    data,
    meta: getNormalizedMeta(response),
    statistics: getNormalizedStatistics(response)
  };
};
