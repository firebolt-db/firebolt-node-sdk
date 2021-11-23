import { ConnectionOptions } from "../connection";
import { Context } from "../context";

export class Authenticator {
  context: Context;
  options: ConnectionOptions;
  accessToken: string | null = null;

  constructor(context: Context, options: ConnectionOptions) {
    this.context = context;
    this.options = options;
  }

  async authenticate() {
    const { httpClient } = this.context;
    const { api_url, username, password } = this.options;
    const path = `https://${api_url}/auth/v1/login`;
    const body = JSON.stringify({
      username,
      password
    });

    const response = await httpClient.request("POST", path, { body });
    const data = await response.json();

    if (data) {
      const { access_token } = data;
      this.accessToken = access_token;
    }
  }

  getRequestHeaders(headers: Record<string, string>) {
    if (this.accessToken) {
      return Object.assign(headers, {
        Authorization: `Bearer ${this.accessToken}`
      });
    }
    return headers;
  }
}
