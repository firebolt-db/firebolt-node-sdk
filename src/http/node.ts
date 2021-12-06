import fetch from "node-fetch";
import { assignProtocol } from "../common/util";
import { ApiError, AuthenticationError } from "../common/errors";
import { Authenticator } from "../auth";

type RequestOptions = {
  headers: Record<string, string>;
  body?: string;
  raw?: boolean;
  text?: boolean;
  retry?: boolean;
};

const DEFAULT_ERROR = "Server error";

export class NodeHttpClient {
  authenticator!: Authenticator;

  async request<T>(
    method: string,
    url: string,
    options?: RequestOptions
  ): Promise<T> {
    const { headers = {}, body, retry = true } = options || {};

    if (this.authenticator) {
      const authHeaders = await this.authenticator.getHeaders();
      Object.assign(headers, authHeaders);
    }

    const withProtocol = assignProtocol(url);

    const response = await fetch(withProtocol, {
      method,
      headers: {
        "user-agent": "javascript-sdk",
        "Content-Type": "application/json",
        ...headers
      },
      body
    });

    if (response.status === 401 && retry) {
      try {
        await this.authenticator.refreshAccessToken();
      } catch (error) {
        throw new AuthenticationError({ message: "AuthenticationError" });
      }

      return this.request<T>(method, url, options);
    }

    if (response.status > 300) {
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const json = await response.json();
        const { message = DEFAULT_ERROR, code } = json;
        throw new ApiError({
          message,
          code,
          status: response.status
        });
      } else {
        const text = await response.text();
        const message = text || DEFAULT_ERROR;
        throw new ApiError({
          message,
          code: "",
          status: response.status
        });
      }
    }

    if (options?.text) {
      return response.text() as unknown as T;
    }

    const parsed = await response.json();
    return parsed;
  }
}
