import { withNullableTypes } from "../common/util";

const typeMapping = {
  date: "date",
  date_ext: "date",
  date32: "date",
  timestamp: "timestamp",
  timestamp_ext: "timestamp",
  datetime: "timestamp",
  "datetime('etc/utc')": "timestamp",
  decimal: "decimal",
  decimal_ext: "decimal",
  long: "long",
  bigint: "long",
  float: "float",
  real: "float",
  float32: "float",
  float64: "double",
  double: "double",
  double32: "double",
  double64: "double",
  "double precision": "double",
  integer: "int",
  int: "int",
  uint: "int",
  int8: "int",
  int16: "int",
  int32: "int",
  int64: "long",
  uint8: "int",
  uint16: "int",
  uint32: "int",
  uint64: "long",
  bytea: "bytea"
};

const COMPLEX_TYPE = /^(nullable|array)\((.+)\)( null)?/;
const STRUCT_TYPE = /^(struct)\((.+)\)/;
const NULLABLE_TYPE = /^(.+)( null)$/;
const DATETIME_TYPE = /datetime64(.+)/i;
const TIMESTAMP_TYPE = /timestamp_ext(.+)/i;
const DECIMAL_TYPE = /decimal(.+)/i;
const NUMERIC_TYPE = /numeric(.+)/i;

const getMappedType = (innerType: string) => {
  const match = NULLABLE_TYPE.exec(innerType);
  const type = match ? match[1] : innerType;
  const nullableSuffix = match ? " null" : "";
  const mappedType = typeMapping[type as keyof typeof typeMapping];
  if (mappedType) {
    return `${mappedType}${nullableSuffix}`;
  }
  const timestampPrecision =
    RegExp(DATETIME_TYPE).exec(type) || RegExp(TIMESTAMP_TYPE).exec(type);
  if (timestampPrecision) {
    return `${typeMapping.timestamp}${timestampPrecision[1]}${nullableSuffix}`;
  }
  const decimalPrecision =
    RegExp(DECIMAL_TYPE).exec(type) || RegExp(NUMERIC_TYPE).exec(type);
  if (decimalPrecision) {
    return `${typeMapping.decimal}${decimalPrecision[1]}${nullableSuffix}`;
  }
};

const DATE_TYPES = withNullableTypes([
  "pg_date",
  "pgdate",
  "date",
  "timestamp",
  "timestamp_tz",
  "timestamptz",
  "timestamp_ntz",
  "timestampntz",
  "datetime",
  "date32",
  "date_ext",
  "timestamp_ext"
]);

export const FLOAT_TYPES = withNullableTypes([
  "float",
  "double",
  "decimal",
  "decimal_ext"
]);

export const BOOLEAN_TYPES = withNullableTypes([
  "boolean"
  //"uint8", uncomment after full boolean support for small values in queries like 'select 1;'
]);

export const INTEGER_TYPES = withNullableTypes(["int", "integer", "long"]);

export const STRING_TYPES = withNullableTypes(["string", "text"]);

export const BYTEA_TYPES = withNullableTypes(["bytea"]);

export const getFireboltType = (type: string): string => {
  const key = type.toLowerCase();
  const match = RegExp(COMPLEX_TYPE).exec(key);
  if (match) {
    const [, outerType, innerType, nullable] = match;
    const fireboltType = getFireboltType(innerType);

    return fireboltType
      ? `${outerType}(${fireboltType})${nullable ?? ""}`
      : key;
  }
  const mappedType = getMappedType(key);
  return mappedType ?? key;
};

export const getInnerType = (type: string): string => {
  const key = type.toLowerCase();
  const match = RegExp(COMPLEX_TYPE).exec(key);
  if (match) {
    const [, , innerType] = match;
    return getFireboltType(innerType);
  }
  const mappedType = getMappedType(key);
  return mappedType ?? key;
};

const trimElement = (element: string) =>
  // Remove leading and trailing spaces and backticks
  element.trim().replace(/(^\s*`?)|(`?\s*$)/g, "");

const decomposeSingleStructType = (type: string): [string, string] => {
  // Given a single struct element like "a int", extract the field and type
  // Finds the second backtick if any or the first space to separate field and type
  let index = type.startsWith("`") ? type.indexOf("`", 1) : -1;
  // If current type is not a quoted field, find the first space
  if (index === -1) {
    index = type.indexOf(" ");
  }
  index = index + 1;
  const key = trimElement(type.substring(0, index));
  const value = trimElement(type.substring(index));
  return [key, value];
};

export const getStructTypes = (type: string): Record<string, string> => {
  // Get a map of top level struct fields and their types, no recursion here
  // Example: "struct(a int, b struct(c text))" => { a: "int", b: "struct(c text)" }
  const match = STRUCT_TYPE.exec(type);
  if (match) {
    // extract types within struct
    const [_, _outerType, innerType] = match;
    // split types by comma (taking into account nested structs)
    const innerTypes = innerType.split(/,(?![^()]*\))/);
    const structTypes: Record<string, string> = {};
    for (const innerType of innerTypes) {
      const [field, type] = decomposeSingleStructType(innerType.trim());
      structTypes[field] = type;
    }
    return structTypes;
  }
  return {};
};

export const isByteAType = (type: string) => {
  return BYTEA_TYPES.indexOf(type) !== -1;
};

export const isDateType = (type: string) => {
  return (
    DATE_TYPES.indexOf(type) !== -1 || RegExp(/datetime64(.+)/i).exec(type)
  );
};

export const isFloatType = (type: string) => {
  return FLOAT_TYPES.includes(type) || RegExp(/decimal(.+)/i).exec(type);
};

export const isNumberType = (type: string) => {
  return INTEGER_TYPES.includes(type) || isFloatType(type);
};

export const isStructType = (type: string) => {
  return STRUCT_TYPE.test(type);
};
