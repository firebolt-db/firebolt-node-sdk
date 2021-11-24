import fetch from "node-fetch";
import { AuthMiddleware } from ".";

export class NodeHttpClient {
  authMiddleware!: AuthMiddleware;

  setAuthMiddleware(middleware: AuthMiddleware) {
    this.authMiddleware = middleware;
  }

  async request(
    method: string,
    path: string,
    options: {
      headers: Headers;
      body: string;
    }
  ) {
    const { headers = {}, body } = options;

    if (this.authMiddleware) {
      const authHeaders = await this.authMiddleware();
      Object.assign(headers, authHeaders);
    }

    const response = await fetch(path, {
      method,
      headers: {
        "user-agent": "javascript-sdk",
        "Content-Type": "application/json",
        ...headers
      },
      body
    });

    return response;
  }
}
