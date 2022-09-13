import { LOGIN, REFRESH } from "../common/api";
import { Context, AuthOptions } from "../types";

type Login = {
  access_token: string;
  refresh_token: string;
};

export class Authenticator {
  context: Context;
  options: AuthOptions;

  accessToken?: string;
  refreshToken?: string;

  constructor(context: Context, options: AuthOptions) {
    context.httpClient.authenticator = this;
    this.context = context;
    this.options = options;
  }

  getHeaders() {
    if (this.accessToken) {
      return {
        Authorization: `Bearer ${this.accessToken}`
      };
    }
    return {};
  }

  async refreshAccessToken() {
    const { httpClient, apiEndpoint } = this.context;

    const url = `${apiEndpoint}/${REFRESH}`;
    const body = JSON.stringify({
      refresh_token: this.refreshToken
    });

    try {
      this.accessToken = undefined;

      const { access_token } = await httpClient
        .request<{
          access_token: string;
        }>("POST", url, { body, retry: false })
        .ready();
      this.accessToken = access_token;
    } catch (error) {
      console.log("Failed to refresh access token");
      console.error(error);
      console.log("Performing login...");
      await this.authenticate();
    }
  }

  async authenticate() {
    const { httpClient, apiEndpoint } = this.context;
    const { username, password, accessToken } = this.options;
    if (accessToken) {
      this.accessToken = accessToken;
      return;
    }
    const url = `${apiEndpoint}/${LOGIN}`;
    const body = JSON.stringify({
      username,
      password
    });

    this.accessToken = undefined;

    const { access_token, refresh_token } = await httpClient
      .request<Login>("POST", url, {
        body,
        retry: false
      })
      .ready();

    this.accessToken = access_token;
    this.refreshToken = refresh_token;
  }
}
