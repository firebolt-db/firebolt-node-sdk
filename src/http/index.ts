export type HttpClientOptions = Record<string, unknown>;

export type AuthMiddleware = () =>
  | Promise<Record<string, string>>
  | Record<string, string>;

export interface HttpClientInterface {
  setAuthMiddleware: (authMiddleware: AuthMiddleware) => void;
  request<T>(
    method: string,
    url: string,
    options?: Record<string, unknown>
  ): Promise<T>;
}

export type HttpClient = {
  new (httpClientOptions?: HttpClientOptions): HttpClientInterface;
};
