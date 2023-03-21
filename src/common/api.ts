export const LOGIN = "auth/v1/login";
export const SERVICE_ACCOUNT_LOGIN = "oauth/token";
export const REFRESH = "auth/v1/refresh";

export const DATABASES = "core/v1/account/databases";
export const ENGINES = "core/v1/account/engines";
export const ACCOUNTS = "core/v1/accounts";

export const ACCOUNT = "iam/v2/account";
export const ACCOUNT_BY_NAME = "iam/v2/accounts:getIdByName";

export const ACCOUNT_SYSTEM_ENGINE = (account_name: string) =>
  `v3/getGatewayHostByAccountName/${account_name}`;

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
