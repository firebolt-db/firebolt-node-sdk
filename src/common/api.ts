export const LOGIN = "auth/v1/login";
export const REFRESH = "auth/v1/refresh";

export const ENGINES = "core/v1/account/engines";
export const ACCOUNTS = "core/v1/accounts";

export type EdgeResult<T> = {
  cursor: string,
  node: T
}

export type ResultsPage<T> = {
  page: {
    page_size: number,
    total_size: number,
    has_previous_page: boolean,
    has_next_page: boolean,
  },
  edges: EdgeResult<T>[]
}