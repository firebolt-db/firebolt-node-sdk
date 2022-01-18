import {
  QueryResponse,
  OutputFormat,
  ExecuteQueryOptions,
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

const getNormalizedMeta = (response: ParsedResponse): Meta[] => {
  if (!response.meta) {
    return [];
  }
  return response.meta.map(normalizeColumn);
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

  const meta = getNormalizedMeta(response);

  const statistics = getNormalizedStatistics(response);

  const data = response.data
    ? response.data.map((row: Row) => {
        const hydratedRow = hydrateRow(row, meta, executeQueryOptions);
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
