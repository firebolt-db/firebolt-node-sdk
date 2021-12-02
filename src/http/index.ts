import { Authenticator } from "../auth";

export type HttpClientOptions = Record<string, unknown>;

export interface HttpClientInterface {
  authenticator: Authenticator;
  request<T>(
    method: string,
    url: string,
    options?: Record<string, unknown>
  ): Promise<T>;
}

export type HttpClient = {
  new (httpClientOptions?: HttpClientOptions): HttpClientInterface;
};
