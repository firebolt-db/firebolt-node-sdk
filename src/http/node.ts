import AgentKeepAlive from "agentkeepalive";

import Abort from "abort-controller";
import fetch, { Response } from "node-fetch";
import { assignProtocol, systemInfoString } from "../common/util";
import { ApiError, AuthenticationError } from "../common/errors";
import { Authenticator } from "../auth/managed";
import { CoreAuthenticator } from "../auth/core";

const { HttpsAgent } = AgentKeepAlive;
const HttpAgent = AgentKeepAlive;

const AbortController = globalThis.AbortController || Abort;

type AgentType = InstanceType<typeof HttpAgent> | InstanceType<typeof HttpsAgent>;

type RequestOptions = {
  headers: Record<string, string>;
  body?: string | URLSearchParams;
  raw?: boolean;
  retry?: boolean;
  noAuth?: boolean;
  retriedErrors?: Set<number>; // Add tracking for retried error status codes
};

type ErrorResponse = {
  message: string;
  code: string;
};

const DEFAULT_ERROR = "Server error";

const DEFAULT_USER_AGENT = systemInfoString();

const PROTOCOL_VERSION_HEADER = "Firebolt-Protocol-Version";
const PROTOCOL_VERSION = "2.4";
const createSocket = HttpsAgent.prototype.createSocket;

const agentOptions = {
  keepAlive: true,
  keepAliveMsecs: 1000,
  timeout: 0,
  freeSocketTimeout: 30000
};

// workaround to set keep alive timeout on first request
// Keep Alive option is not working on https.agent #47137
// https://github.com/nodejs/node/issues/47137

HttpsAgent.prototype.createSocket = function (req, options, cb) {
  req.on("socket", socket => {
    socket.setKeepAlive(agentOptions.keepAlive, agentOptions.keepAliveMsecs);
  });
  createSocket.call(this, req, options, cb);
};

export class NodeHttpClient {
  authenticator!: Authenticator | CoreAuthenticator;
  private agentCache!: Map<string, AgentType>;

  constructor() {
    this.agentCache = new Map();
  }

  private getAgent = (url: string): AgentType => {
    const withProtocol = assignProtocol(url);
    const urlObj = new URL(withProtocol);
    const isHttp = urlObj.protocol === "http:";
    const hostname = urlObj.hostname;

    const cacheKey = `${isHttp ? "http" : "https"}:${hostname}`;
    if (this.agentCache.has(cacheKey)) {
      return this.agentCache.get(cacheKey) as AgentType;
    }

    const agent = isHttp
      ? new HttpAgent(agentOptions)
      : new HttpsAgent(agentOptions);
    this.agentCache.set(cacheKey, agent);
    return agent;
  };

  request<T>(
    method: string,
    url: string,
    options?: RequestOptions
  ): {
    ready: () => Promise<T>;
    abort: () => void;
  } {
    const {
      headers = {},
      body,
      retry = true,
      retriedErrors = new Set<number>()
    } = options || {};
    const controller = new AbortController();
    const agent = this.getAgent(url);

    const abort = () => {
      controller.abort();
      agent.destroy();
    };

    const addAuthHeaders = async (requestHeaders: Record<string, string>) => {
      if (options?.noAuth) {
        return requestHeaders;
      }

      return this.authenticator.addAuthHeaders(requestHeaders);
    };

    const handleErrorResponse = async (response: Response): Promise<never> => {
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const text = await response.text();
        let json = {};
        try {
          json = JSON.parse(text);
        } catch {
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
    };

    const makeRequest = async () => {
      const headersWithAuth = await addAuthHeaders(headers);
      const withProtocol = assignProtocol(url);
      const userAgent = headersWithAuth["user-agent"] || DEFAULT_USER_AGENT;

      const response = await fetch(withProtocol, {
        agent,
        signal: controller.signal as any,
        method,
        headers: {
          "user-agent": userAgent,
          "Content-Type": "application/json",
          [PROTOCOL_VERSION_HEADER]: PROTOCOL_VERSION,
          ...headersWithAuth
        },
        body
      });

      if (
        (response.status === 401 || response.status === 403) &&
        retry &&
        !retriedErrors.has(response.status) &&
        !this.authenticator.isFireboltCore()
      ) {
        try {
          console.warn(
            `Access token expired (${response.status}), refreshing access token and retrying request`
          );
          await this.authenticator.reAuthenticate();
        } catch (error) {
          throw new AuthenticationError({
            message: "Failed to refresh access token"
          });
        }

        const updatedRetriedErrors = new Set(retriedErrors);
        updatedRetriedErrors.add(response.status);

        const request = this.request<T>(method, url, {
          headers: options?.headers ?? {},
          body: options?.body,
          raw: options?.raw,
          retry: true,
          retriedErrors: updatedRetriedErrors
        });
        return request.ready();
      }

      if (response.status > 300) {
        return handleErrorResponse(response);
      }

      if (options?.raw) {
        return response as unknown as T;
      }

      const parsed = await response.json();
      return parsed as T;
    };

    const ready = () => promise as Promise<T>;
    const promise = makeRequest();

    return {
      abort,
      ready
    };
  }
}
