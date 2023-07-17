import { Agent } from "https";
import Abort from "abort-controller";
import fetch from "node-fetch";
import { AbortSignal } from "node-fetch/externals";
import { assignProtocol, systemInfoString } from "../common/util";
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

const DEFAULT_USER_AGENT = systemInfoString();

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

      const userAgent = headers["user-agent"] || DEFAULT_USER_AGENT;
      const response = await fetch(withProtocol, {
        agent,
        signal: controller.signal as AbortSignal,
        method,
        headers: {
          "user-agent": userAgent,
          "Content-Type": "application/json",
          ...headers
        },
        body
      });

      if (response.status === 401 && retry) {
        try {
          await this.authenticator.authenticate();
        } catch (error) {
          console.error(error);
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
          const text = await response.text();
          let json = {};
          try {
            const parsed = JSON.parse(text);
            json = parsed;
          } catch (e) {
            json = {
              code: response.status,
              message: text
            };
          }
          const { message = DEFAULT_ERROR, code } = json as ErrorResponse;
          throw new ApiError({
            message,
            code,
            status: response.status,
            raw: json,
            url
          });
        } else {
          const text = await response.text();
          const message = text || DEFAULT_ERROR;
          throw new ApiError({
            message,
            code: "",
            status: response.status,
            url
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
