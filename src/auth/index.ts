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
    const { httpClient, apiUrl } = this.context;
    const { username, password } = this.options;
    const url = `${apiUrl}/${LOGIN}`;
    const body = JSON.stringify({
      username,
      password
    });

    const data = await httpClient.request("POST", url, { body });

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
