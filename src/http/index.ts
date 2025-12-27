import { Authenticator } from "../auth/managed";
import { CoreAuthenticator } from "../auth/core";

export type HttpClientOptions = Record<string, unknown>;

export interface HttpClientInterface {
  authenticator: Authenticator | CoreAuthenticator;
  request<T>(
    method: string,
    url: string,
    options?: Record<string, unknown>
  ): {
    ready: () => Promise<T>;
    abort: () => void;
  };
}

export type HttpClient = {
  new (httpClientOptions?: HttpClientOptions): HttpClientInterface;
};
