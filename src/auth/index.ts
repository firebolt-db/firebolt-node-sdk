import { LOGIN } from "../common/api";
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
    const path = `https://${api_url}/${LOGIN}`;
    const body = JSON.stringify({
      username,
      password
    });

    const response = await httpClient.request("POST", path, { body });
    const data = await response.json();

    if (data) {
      const { access_token } = data;
      this.accessToken = access_token;
      httpClient.setAuthMiddleware(() => {
        return {
          Authorization: `Bearer ${this.accessToken}`
        };
      });
    }
  }
}
