import fetch from "node-fetch";
import { AuthMiddleware } from ".";
import { assignProtocol } from "../common/util";

type RequestOptions = {
  headers: Headers;
  body: string;
  raw?: boolean;
  text?: boolean;
};

export class NodeHttpClient {
  authMiddleware!: AuthMiddleware;

  setAuthMiddleware(middleware: AuthMiddleware) {
    this.authMiddleware = middleware;
  }

  async request(method: string, url: string, options?: RequestOptions) {
    const { headers = {}, body } = options || {};

    if (this.authMiddleware) {
      const authHeaders = await this.authMiddleware();
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

    if (options?.text) {
      return response.text();
    }

    if (options?.raw) {
      return response;
    }

    const json = await response.json();
    return json;
  }
}
