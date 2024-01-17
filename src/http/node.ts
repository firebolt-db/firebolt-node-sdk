import { HttpsAgent } from "agentkeepalive";

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

const PROTOCOL_VERSION_HEADER = "Firebolt-Protocol-Version";
const PROTOCOL_VERSION = "2.0";
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
  authenticator!: Authenticator;
  agentCache!: Map<string, HttpsAgent>;

  constructor() {
    this.agentCache = new Map();
  }

  getAgent = (url: string): HttpsAgent => {
    const { hostname } = new URL(`https://${url}`);
    if (this.agentCache.has(hostname)) {
      return this.agentCache.get(hostname) as HttpsAgent;
    }

    const agent = new HttpsAgent(agentOptions);
    this.agentCache.set(hostname, agent);
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
    const { headers = {}, body, retry = true } = options || {};
    const controller = new AbortController();
    const agent = this.getAgent(url);

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
          [PROTOCOL_VERSION_HEADER]: PROTOCOL_VERSION,
          ...headers
        },
        body
      });

      if (response.status === 401 && retry) {
        try {
          await this.authenticator.authenticate();
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
