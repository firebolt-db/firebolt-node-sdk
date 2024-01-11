export const SERVICE_ACCOUNT_LOGIN = "oauth/token";

export const QUERY_URL = "query";
export const ACCOUNT_SYSTEM_ENGINE = (accountName: string) =>
  `web/v3/account/${accountName}/engineUrl`;
export const ACCOUNT_ID_BY_NAME = (accountName: string) =>
  `web/v3/account/${accountName}/resolve`;

// V1

export const USERNAME_PASSWORD_LOGIN = "auth/v1/login"; // legit:ignore-secrets

export const ACCOUNT = "iam/v2/account";
export const ACCOUNT_BY_NAME = "iam/v2/accounts:getIdByName";

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

export const ACCOUNT_DATABASE_BINDING_URL = (
  accountId: string,
  databaseId: string,
  engineId: string
) => ACCOUNT_DATABASE(accountId, databaseId) + `/bindings/${engineId}`;

export const ACCOUNT_ENGINE_START = (accountId: string, engineId: string) =>
  ACCOUNT_ENGINE(accountId, engineId) + ":start";
export const ACCOUNT_ENGINE_RESTART = (accountId: string, engineId: string) =>
  ACCOUNT_ENGINE(accountId, engineId) + ":restart";
export const ACCOUNT_ENGINE_STOP = (accountId: string, engineId: string) =>
  ACCOUNT_ENGINE(accountId, engineId) + ":stop";

export const REGIONS = "compute/v1/regions";
export const ACCOUNT_INSTANCE_TYPES = (accountId: string) =>
  `aws/v2/accounts/${accountId}/instanceTypes`;

export const ACCOUNT_BINDINGS_URL = (accountId: string) =>
  `core/v1/accounts/${accountId}/bindings`;

export const ENGINES_BY_IDS_URL = "core/v1/engines:getByIds";

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
