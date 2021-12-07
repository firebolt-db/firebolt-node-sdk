import { withNullableType } from "../common/util";
import {
  QueryResponse,
  QuerySettings,
  Meta,
  OutputFormat,
  ExecuteQueryOptions,
  Row
} from "../types";

type ParsedResponse = {
  data: any;
  statistics: any;
  meta: any;
};

const getTypedValue = (
  value: string | number | null,
  meta: { type: string }
) => {
  const { type } = meta;
  switch (type.toUpperCase()) {
    case withNullableType("DATETIME"):
    case withNullableType("DATE"):
    case withNullableType("TIMESTAMP"):
    case "DATETIME":
    case "DATE":
    case "TIMESTAMP": {
      if (value) {
        return new Date(value);
      }
      return value;
    }
    default: {
      return value;
    }
  }
};

const getTypedData = (
  response: ParsedResponse,
  settings: QuerySettings
): Row[] => {
  if (!response.data) {
    return [];
  }

  const { data, meta } = response;

  const isJSON = settings.output_format === OutputFormat.JSON;
  for (const row of data) {
    for (const index in meta) {
      const column = meta[index];
      const elementIndex = isJSON ? column.name : +index;
      row[elementIndex] = getTypedValue(row[elementIndex], column);
    }
  }
  return data;
};

const getNormalizedValue = ({
  index,
  row,
  meta,
  settings
}: {
  index: number;
  row: Row;
  meta: Meta[];
  settings: QuerySettings;
}) => {
  const { name } = meta[index];
  if (settings.output_format === OutputFormat.JSON) {
    return (row as Record<string, unknown>)[name];
  }

  if (
    settings.output_format === OutputFormat.JSON_COMPACT ||
    settings.output_format === OutputFormat.JSON_COMPACT_LIMITED ||
    !settings.output_format
  ) {
    return (row as unknown[])[index];
  }
};

const getNormalizedData = (
  response: ParsedResponse,
  settings: QuerySettings
): Row[] => {
  const { meta } = response;
  const typedData = getTypedData(response, settings);
  const rows = [];

  for (const row of typedData) {
    const normalizedRow: Row = {};

    for (const index in meta) {
      const { name } = meta[index];

      const normalizedValue = getNormalizedValue({
        index: +index,
        row,
        meta,
        settings
      });
      normalizedRow[name] = normalizedValue;
    }
    rows.push(normalizedRow);
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
  const { settings = {}, response: { normalizeData = false } = {} } =
    executeQueryOptions;

  const meta = getNormalizedMeta(response);

  const statistics = getNormalizedStatistics(response);

  const data = normalizeData
    ? getNormalizedData(response, settings)
    : getTypedData(response, settings);

  return {
    data,
    meta,
    statistics
  };
};
