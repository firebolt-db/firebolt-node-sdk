export const SERVICE_ACCOUNT_LOGIN = "oauth/token";

export const QUERY_URL = "query";
export const ACCOUNT_SYSTEM_ENGINE = (accountName: string) =>
  `web/v3/account/${accountName}/engineUrl`;
export const ACCOUNT_ID_BY_NAME = (accountName: string) =>
  `web/v3/account/${accountName}/resolve`;

// V1

export const USERNAME_PASSWORD_LOGIN = "auth/v1/login";

export const ACCOUNT_ENGINE = (accountId: string, engineId: string) =>
  `core/v1/accounts/${accountId}/engines/${engineId}`;

export const ACCOUNT_ENGINES = (accountId: string) =>
  `core/v1/accounts/${accountId}/engines`;

export const ACCOUNT_ENGINE_URL_BY_DATABASE_NAME = (accountId: string) =>
  ACCOUNT_ENGINES(accountId) + ":getURLByDatabaseName";

export const ACCOUNT_DATABASE = (accountId: string, databaseId: string) =>
  `core/v1/accounts/${accountId}/databases/${databaseId}`;

export const ACCOUNT_DATABASES = (accountId: string) =>
  `core/v1/accounts/${accountId}/databases`;

export const ACCOUNT_ENGINE_START = (accountId: string, engineId: string) =>
  ACCOUNT_ENGINE(accountId, engineId) + ":start";
export const ACCOUNT_ENGINE_RESTART = (accountId: string, engineId: string) =>
  ACCOUNT_ENGINE(accountId, engineId) + ":restart";
export const ACCOUNT_ENGINE_STOP = (accountId: string, engineId: string) =>
  ACCOUNT_ENGINE(accountId, engineId) + ":stop";

export type EdgeResult<T> = {
  cursor: string;
  node: T;
};

export type ResultsPage<T> = {
  page: {
    page_size: number;
    total_size: number;
    has_previous_page: boolean;
    has_next_page: boolean;
  };
  edges: EdgeResult<T>[];
};
