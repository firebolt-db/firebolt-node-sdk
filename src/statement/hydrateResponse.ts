import BigNumber from "bignumber.js";
import { ExecuteQueryOptions, Row } from "../types";
import { Meta } from "../meta";
import {
  isByteAType,
  isDateType,
  isNumberType,
  getInnerType,
  getStructTypes,
  isStructType
} from "./dataTypes";
import { hydrateDate } from "./hydrateDate";

const infNanValues = ["inf", "-inf", "nan", "-nan"];

const hydrateInfNan = (value: string) => {
  if (value === "inf") {
    return Infinity;
  }
  if (value === "-inf") {
    return -Infinity;
  }
  return NaN;
};

const hydrateStruct = (
  value: Record<string, unknown>,
  type: string,
  executeQueryOptions: ExecuteQueryOptions
): Record<string, unknown> => {
  const hydratedStruct: Record<string, unknown> = {};
  const innerTypes = getStructTypes(type);
  // if number of keys does not match, return value as is
  if (Object.keys(innerTypes).length !== Object.keys(value).length) {
    return value;
  }
  for (const [key, innerType] of Object.entries(innerTypes)) {
    hydratedStruct[key] = getHydratedValue(
      value[key],
      innerType,
      executeQueryOptions
    );
  }
  return hydratedStruct;
};

const getHydratedValue = (
  value: unknown,
  type: string,
  executeQueryOptions: ExecuteQueryOptions
): any => {
  if (isStructType(type)) {
    return hydrateStruct(
      value as Record<string, unknown>,
      type,
      executeQueryOptions
    );
  }
  if (Array.isArray(value)) {
    const innerType = getInnerType(type);
    return value.map(element =>
      getHydratedValue(element, innerType, executeQueryOptions)
    );
  }
  if (isDateType(type)) {
    return value ? hydrateDate(value as string) : value;
  }
  if (isNumberType(type)) {
    if (infNanValues.includes(value as string)) {
      return hydrateInfNan(value as string);
    }
    if (
      executeQueryOptions.response?.bigNumberAsString &&
      typeof value === "object" &&
      BigNumber.isBigNumber(value)
    ) {
      return value.toString();
    }
    if (typeof value === "string" && type === "long") {
      return new BigNumber(value);
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

  for (const [index, column] of meta.entries()) {
    if (isArray) {
      const key = +index;
      (hydratedRow as unknown[])[key] = getHydratedValue(
        row[key],
        column.type,
        executeQueryOptions
      );
    } else {
      const key = column.name;
      (hydratedRow as Record<string, unknown>)[key] = getHydratedValue(
        row[key],
        column.type,
        executeQueryOptions
      );
    }
  }
  return hydratedRow;
};
