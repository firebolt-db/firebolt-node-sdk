import { withNullableTypes } from "../common/util";

const typeMapping = {
  date: "date",
  timestamp: "timestamp",
  datetime: "datetime",
  long: "long",
  float: "float",
  float32: "float",
  float64: "float",
  double: "double",
  double32: "double",
  double64: "double",
  integer: "integer",
  int: "int",
  uint: "int",
  int8: "int",
  int16: "int",
  int32: "int",
  int64: "int",
  uint8: "int",
  uint16: "int",
  uint32: "int",
  uint64: "int"
};

export const DATE_TYPES = withNullableTypes(["date", "timestamp", "datetime"]);

export const FLOAT_TYPES = withNullableTypes(["float", "double"]);

export const BOOLEAN_TYPES = withNullableTypes([
  "boolean"
  //"uint8", uncomment after full boolean support for small values in queries like 'select 1;'
]);

export const INTEGER_TYPES = withNullableTypes(["int", "integer", "long"]);

export const STRING_TYPES = withNullableTypes(["string", "text"]);

export const NUMBER_TYPES = [...INTEGER_TYPES, ...FLOAT_TYPES];

export const getFireboltType = (type: string): string => {
  const key = type.toLowerCase();
  if (key in typeMapping) {
    return typeMapping[key as keyof typeof typeMapping];
  }
  return key;
};
