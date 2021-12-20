import { withNullableTypes } from "../common/util";

export const DATE_TYPES = withNullableTypes([
  "DATE",
  "TIMESTAMP",
  "DATETIME",
  "DATETIME('ETC/UTC')"
]);

export const FLOAT_TYPES = withNullableTypes([
  "FLOAT",
  "FLOAT32",
  "FLOAT64",
  "DOUBLE",
  "DOUBLE32",
  "DOUBLE64"
]);

export const BOOLEAN_TYPES = withNullableTypes([
  "BOOLEAN"
  //"UINT8", uncomment after full boolean support for small values in queries like 'select 1;'
]);

export const INTEGER_TYPES = withNullableTypes([
  "UINT8",
  "INT8",
  "INT16",
  "INT32",
  "INT64",
  "UINT16",
  "UINT32",
  "UINT64",
  "INT",
  "UINT",
  "INTEGER",
  "LONG"
]);

export const STRING_TYPES = withNullableTypes(["STRING", "TEXT"]);

export const NUMBER_TYPES = [...INTEGER_TYPES, ...FLOAT_TYPES];
