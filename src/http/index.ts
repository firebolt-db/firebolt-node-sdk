export type HttpClientOptions = Record<string, unknown>;

export type AuthMiddleware = () =>
  | Promise<Record<string, string>>
  | Record<string, string>;

export interface HttpClientInterface {
  setAuthMiddleware: (authMiddleware: AuthMiddleware) => void;
  request(
    method: string,
    path: string,
    options: Record<string, unknown>
  ): Promise<any>;
}

export type HttpClient = {
  new (httpClientOptions?: HttpClientOptions): HttpClientInterface;
};
