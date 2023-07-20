export const SERVICE_ACCOUNT_LOGIN = "oauth/token";

export const QUERY_URL = "query";
export const ACCOUNT_SYSTEM_ENGINE = (accountName: string) =>
  `web/v3/account/${accountName}/engineUrl`;
export const ACCOUNT_ID_BY_NAME = (accountName: string) =>
  `web/v3/account/${accountName}/resolve`;
