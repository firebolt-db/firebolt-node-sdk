import { Authenticator } from "../auth/managed";
import { CoreAuthenticator } from "../auth/core";

export type HttpClientOptions = Record<string, unknown>;

export const CONTENT_TYPE = {
  TEXT: "text/plain; charset=utf-8",
  JSON: "application/json",
  FORM: "application/x-www-form-urlencoded"
} as const;

export type RequestOptions = {
  // Content-Type must be set through contentType; the client rejects it in headers.
  headers?: Record<string, string>;
  body?: string | URLSearchParams;
  contentType?: string;
  raw?: boolean;
  retry?: boolean;
  noAuth?: boolean;
  retriedErrors?: Set<number>;
};

export interface HttpClientInterface {
  authenticator: Authenticator | CoreAuthenticator;
  request<T>(
    method: string,
    url: string,
    options?: RequestOptions
  ): {
    ready: () => Promise<T>;
    abort: () => void;
  };
}

export type HttpClient = {
  new (httpClientOptions?: HttpClientOptions): HttpClientInterface;
};
