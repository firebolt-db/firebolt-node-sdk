import BigNumber from "bignumber.js";
import { withNullableType } from "../common/util";
import { Meta, ExecuteQueryOptions, Row } from "../types";

const getHydratedValue = (
  value: unknown,
  meta: { type: string },
  executeQueryOptions: ExecuteQueryOptions
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
        return new Date(value as string);
      }
      return value;
    }
    case withNullableType("DOUBLE"):
    case withNullableType("FLOAT"):
    case withNullableType("FLOAT64"):
    case withNullableType("DOUBLE64"):
    case "DOUBLE":
    case "FLOAT":
    case "FLOAT64":
    case "DOUBLE64": {
      if (
        executeQueryOptions.response?.bigNumberAsString &&
        typeof value === "object" &&
        BigNumber.isBigNumber(value)
      ) {
        return value.toString();
      }
      return value;
    }
    default: {
      return value;
    }
  }
};

export const hydrateRow = (
  row: Row,
  meta: Meta[],
  executeQueryOptions: ExecuteQueryOptions
) => {
  const isArray = Array.isArray(row);
  const hydratedRow = isArray ? [] : {};

  for (const index in meta) {
    const column = meta[index];
    if (isArray) {
      const key = +index;
      (hydratedRow as unknown[])[key] = getHydratedValue(
        row[key],
        column,
        executeQueryOptions
      );
    } else {
      const key = column.name;
      (hydratedRow as Record<string, unknown>)[key] = getHydratedValue(
        row[key],
        column,
        executeQueryOptions
      );
    }
  }
  return hydratedRow;
};
