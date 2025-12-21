import AgentKeepAlive from "agentkeepalive";
import http from "http";
import https from "https";

import Abort from "abort-controller";
import { Response, Headers } from "node-fetch";
import { assignProtocol, systemInfoString } from "../common/util";
import { ApiError, AuthenticationError } from "../common/errors";
import { Authenticator } from "../auth/managed";
import { CoreAuthenticator } from "../auth/core";

const { HttpsAgent } = AgentKeepAlive;
type HttpAgent = typeof AgentKeepAlive;

const AbortController = globalThis.AbortController || Abort;

// Use public types to avoid exposing private agent types
type AgentType = http.Agent | https.Agent;

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

  getAgent = (url: string): AgentType => {
    const withProtocol = assignProtocol(url);
    const urlObj = new URL(withProtocol);
    const isHttp = urlObj.protocol === "http:";
    const hostname = urlObj.hostname;

    const cacheKey = `${isHttp ? "http" : "https"}:${hostname}`;
    if (this.agentCache.has(cacheKey)) {
      return this.agentCache.get(cacheKey) as AgentType;
    }

    const agent = isHttp
      ? new AgentKeepAlive(agentOptions)
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
      const urlObj = new URL(withProtocol);
      const isHttp = urlObj.protocol === "http:";
      const requestModule = isHttp ? http : https;
      const userAgent = headersWithAuth["user-agent"] || DEFAULT_USER_AGENT;

      const response = await new Promise<Response>((resolve, reject) => {
        const req = requestModule.request(
          {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttp ? 80 : 443),
            path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          "user-agent": userAgent,
          "Content-Type": "application/json",
          [PROTOCOL_VERSION_HEADER]: PROTOCOL_VERSION,
          ...headersWithAuth
        },
            agent
          },
          res => {
            // For raw/streaming responses, don't consume the stream - pass it through
            if (options?.raw) {
              const response = {
                status: res.statusCode || 200,
                statusText: res.statusMessage || "OK",
                headers: new Headers(
                  Object.entries(res.headers).reduce((acc, [key, value]) => {
                    if (value !== undefined && value !== null) {
                      acc[key] = Array.isArray(value) ? value.join(", ") : String(value);
                    }
                    return acc;
                  }, {} as Record<string, string>)
                ),
                ok: (res.statusCode || 200) >= 200 && (res.statusCode || 200) < 300,
                body: res,
                text: async () => {
                  const chunks: Buffer[] = [];
                  for await (const chunk of res) {
                    chunks.push(Buffer.from(chunk));
                  }
                  return Buffer.concat(chunks as Uint8Array[]).toString();
                },
                json: async () => {
                  const chunks: Buffer[] = [];
                  for await (const chunk of res) {
                    chunks.push(Buffer.from(chunk));
                  }
                  return JSON.parse(Buffer.concat(chunks as Uint8Array[]).toString() || "{}");
                },
                arrayBuffer: async () => {
                  const chunks: Buffer[] = [];
                  for await (const chunk of res) {
                    chunks.push(Buffer.from(chunk));
                  }
                  return Buffer.concat(chunks as Uint8Array[]).buffer;
                }
              } as unknown as Response;

              resolve(response);
              return;
            }

            // For non-raw responses, consume the stream and parse
            (async () => {
              const chunks: Buffer[] = [];
              for await (const chunk of res) {
                chunks.push(Buffer.from(chunk));
              }
              const data = Buffer.concat(chunks as Uint8Array[]).toString();
              const buffer = Buffer.concat(chunks as Uint8Array[]);

              const response = {
                status: res.statusCode || 200,
                statusText: res.statusMessage || "OK",
                headers: new Headers(
                  Object.entries(res.headers).reduce((acc, [key, value]) => {
                    if (value !== undefined && value !== null) {
                      acc[key] = Array.isArray(value) ? value.join(", ") : String(value);
                    }
                    return acc;
                  }, {} as Record<string, string>)
                ),
                ok: (res.statusCode || 200) >= 200 && (res.statusCode || 200) < 300,
                body: undefined,
                text: async () => data,
                json: async () => JSON.parse(data || "{}"),
                arrayBuffer: async () => buffer.buffer
              } as unknown as Response;

              resolve(response);
            })();
          }
        );

        req.on("error", error => {
          const nodeError = error as NodeJS.ErrnoException;
          // Check if this error was caused by a user-initiated abort
          const isAborted = controller.signal.aborted;
          const errorMessage = isAborted
            ? "The user aborted a request."
            : error.message || `Connection failed: ${nodeError.code || "unknown error"}`;
          reject(
            new ApiError({
              message: errorMessage,
              code: nodeError.code || "",
              status: 0,
              url: urlObj.toString()
            })
          );
        });

        if (controller.signal.aborted) {
          req.destroy();
          return;
        }
        controller.signal.addEventListener("abort", () => req.destroy());

        if (body) {
          // Convert URLSearchParams to string if needed
          const bodyString = body instanceof URLSearchParams ? body.toString() : (body as string);
          req.write(bodyString);
        }
        req.end();
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
