import { Agent } from "https";
import Abort from "abort-controller";
import fetch from "node-fetch";
import { assignProtocol } from "../common/util";
import { ApiError, AuthenticationError } from "../common/errors";
import { Authenticator } from "../auth";

const AbortController = globalThis.AbortController || Abort;

type RequestOptions = {
  headers: Record<string, string>;
  body?: string;
  raw?: boolean;
  retry?: boolean;
};

type ErrorResponse = {
  message: string;
  code: string;
};

const DEFAULT_ERROR = "Server error";

export class NodeHttpClient {
  authenticator!: Authenticator;

  request<T>(
    method: string,
    url: string,
    options?: RequestOptions
  ): {
    ready: () => Promise<T>;
    abort: () => void;
  } {
    const { headers = {}, body, retry = true } = options || {};
    const controller = new AbortController();
    const agent = new Agent({ keepAlive: true, keepAliveMsecs: 1000 });

    const abort = () => {
      controller.abort();
      agent.destroy();
    };

    const makeRequest = async () => {
      if (this.authenticator) {
        const authHeaders = await this.authenticator.getHeaders();
        Object.assign(headers, authHeaders);
      }

      const withProtocol = assignProtocol(url);

      const response = await fetch(withProtocol, {
        agent,
        signal: controller.signal as AbortSignal,
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
          throw new AuthenticationError({
            message: "Failed to refresh access token"
          });
        }

        const request = this.request<T>(method, url, options);
        return request.ready();
      }

      if (response.status > 300) {
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const json = await response.json();
          const { message = DEFAULT_ERROR, code } = json as ErrorResponse;
          throw new ApiError({
            message,
            code,
            status: response.status,
            raw: json
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

      if (options?.raw) {
        return response;
      }

      const parsed = await response.json();
      return parsed as T;
    };

    const promise = makeRequest();

    const ready = () => promise as Promise<T>;

    return {
      abort,
      ready
    };
  }
}
