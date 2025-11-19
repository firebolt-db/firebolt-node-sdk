import {
  ExecuteQueryOptions,
  OutputFormat,
  QueryResponse,
  Row
} from "../types";
import { Meta } from "../meta";
import { hydrateRow } from "./hydrateResponse";

type ParsedResponse = {
  data: any;
  statistics: any;
  meta: any;
};

export const normalizeRow = (
  row: Row,
  meta: Meta[],
  executeQueryOptions: ExecuteQueryOptions
) => {
  const { settings = {} } = executeQueryOptions;
  if (settings.output_format === OutputFormat.JSON) {
    return row;
  }
  const normalizedRow: Row = {};

  for (const index in meta) {
    const { name } = meta[index];
    normalizedRow[name] = (row as unknown[])[+index];
  }
  return normalizedRow;
};

export const normalizeColumn = (column: { name: string; type: string }) => {
  return new Meta(column);
};

export const getNormalizedMeta = (meta: any[]): Meta[] => {
  if (!meta) {
    return [];
  }
  return meta.map(normalizeColumn);
};

export const getNormalizedStatistics = (response: ParsedResponse) => {
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
  const { response: { normalizeData = false } = {} } = executeQueryOptions;

  const hydrate = executeQueryOptions?.response?.hydrateRow || hydrateRow;

  const meta = getNormalizedMeta(response.meta);

  const statistics = getNormalizedStatistics(response);

  const data = response.data
    ? response.data.map((row: Row) => {
        const hydratedRow = hydrate(row, meta, executeQueryOptions);
        if (normalizeData) {
          const normalizedRow = normalizeRow(
            hydratedRow,
            meta,
            executeQueryOptions
          );
          return normalizedRow;
        }
        return hydratedRow;
      })
    : [];

  return {
    data,
    meta,
    statistics
  };
};

export const normalizeResponseRowStreaming = (
  data: any[],
  executeQueryOptions: ExecuteQueryOptions,
  meta: Meta[]
): Row[] => {
  const { response: { normalizeData = false } = {} } = executeQueryOptions;

  const hydrate = executeQueryOptions?.response?.hydrateRow || hydrateRow;
  const result: Row[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const hydratedRow = hydrate(data[i], meta, executeQueryOptions);
    if (normalizeData) {
      result[i] = normalizeRow(hydratedRow, meta, executeQueryOptions);
    } else {
      result[i] = hydratedRow;
    }
  }
  return result;
};
