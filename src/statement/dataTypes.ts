import { withNullableTypes } from "../common/util";

const typeMapping = {
  date: "date",
  date_ext: "date_ext",
  date32: "date_ext",
  timestamp: "timestamp",
  timestamp_ext: "timestamp_ext",
  datetime: "timestamp",
  "datetime('etc/utc')": "timestamp",
  decimal: "decimal",
  decimal_ext: "decimal_ext",
  long: "long",
  float: "float",
  float32: "float",
  float64: "double",
  double: "double",
  double32: "double",
  double64: "double",
  integer: "integer",
  int: "int",
  uint: "int",
  int8: "int",
  int16: "int",
  int32: "int",
  int64: "long",
  uint8: "int",
  uint16: "int",
  uint32: "int",
  uint64: "long"
};

const getMappedType = (innerType: string) => {
  const type = typeMapping[innerType as keyof typeof typeMapping];
  if (type) {
    return type;
  }
  if (innerType.match(/datetime64(.+)/i)) {
    return typeMapping.timestamp_ext;
  }
  if (innerType.match(/decimal(.+)/i)) {
    return typeMapping.decimal_ext;
  }
};

const COMPLEX_TYPE = /(nullable|array)\((.+)\)/;

export const DATE_TYPES = withNullableTypes(["date", "timestamp", "datetime"]);

export const FLOAT_TYPES = withNullableTypes(["float", "double"]);

export const BOOLEAN_TYPES = withNullableTypes([
  "boolean"
  //"uint8", uncomment after full boolean support for small values in queries like 'select 1;'
]);

export const INTEGER_TYPES = withNullableTypes(["int", "integer", "long"]);

export const STRING_TYPES = withNullableTypes(["string", "text"]);

export const getFireboltType = (type: string): string => {
  const key = type.toLowerCase();
  const match = key.match(COMPLEX_TYPE);
  if (match) {
    const [_, outerType, innerType] = match;
    const mappedType = getMappedType(innerType);
    return mappedType ? `${outerType}(${mappedType})` : key;
  }
  const mappedType = typeMapping[key as keyof typeof typeMapping];
  return mappedType || key;
};

export const isDateType = (type: string) => {
  return DATE_TYPES.indexOf(type) !== -1 || type.match(/datetime64(.+)/i);
};

export const isFloatType = (type: string) => {
  return FLOAT_TYPES.includes(type) || type.match(/decimal(.+)/i);
};

export const isNumberType = (type: string) => {
  return INTEGER_TYPES.includes(type) || isFloatType(type);
};
