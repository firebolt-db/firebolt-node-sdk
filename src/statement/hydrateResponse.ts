import BigNumber from "bignumber.js";
import { ExecuteQueryOptions, Row } from "../types";
import { Meta } from "../meta";
import { isByteAType, isDateType, isNumberType } from "./dataTypes";
import { hydrateDate } from "./hydrateDate";

const getHydratedValue = (
  value: unknown,
  meta: Meta,
  executeQueryOptions: ExecuteQueryOptions
) => {
  const { type } = meta;
  if (isDateType(type)) {
    return value ? hydrateDate(value as string) : value;
  }
  if (isNumberType(type)) {
    if (
      executeQueryOptions.response?.bigNumberAsString &&
      typeof value === "object" &&
      BigNumber.isBigNumber(value)
    ) {
      return value.toString();
    }
    return value;
  }
  if (isByteAType(type) && value != null) {
    const valueWithoutPrefix = (value as string).substring(2);
    return Buffer.from(valueWithoutPrefix.toString(), "hex");
  }
  return value;
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
