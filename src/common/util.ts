import { ArgumentError } from "./errors";

export const assignProtocol = (url: string) => {
  return url.startsWith("http") ? url : `https://${url}`;
};

export const isDataQuery = (query: string): boolean => {
  if (!query) {
    return false;
  }

  query = query.trim().toUpperCase();
  const isShow = query.startsWith("SHOW");
  const isDescribe = query.startsWith("DESCRIBE");
  const isExplain = query.startsWith("EXPLAIN");
  const isInsert = query.startsWith("INSERT");
  const isSelect = !isInsert && query.startsWith("SELECT");
  const isWith = !isInsert && query.startsWith("WITH");

  return isSelect || isWith || isExplain || isShow || isDescribe;
};

export const withNullableTypes = (types: string[]) => {
  return types.reduce((acc: string[], type) => {
    acc.push(type);
    acc.push(`nullable(${type})`);
    return acc;
  }, []);
};

export const checkArgumentExists = (expression: any, code: number) => {
  if (!expression) {
    throw new ArgumentError({ code });
  }
};

export const checkArgumentValid = (expression: any, code: number) => {
  if (!expression) {
    throw new ArgumentError({ code });
  }
};
