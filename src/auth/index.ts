import { LOGIN, SERVICE_ACCOUNT_LOGIN, REFRESH } from "../common/api";
import {
  Context,
  ConnectionOptions,
  ServiceAccountAuth,
  UsernamePasswordAuth,
  AccessTokenAuth
} from "../types";

type Login = {
  access_token: string;
  refresh_token: string;
};

export class Authenticator {
  context: Context;
  options: ConnectionOptions;

  accessToken?: string;
  refreshToken?: string;

  constructor(context: Context, options: ConnectionOptions) {
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

  authenticateWithToken(auth: AccessTokenAuth) {
    const { accessToken } = auth;
    this.accessToken = accessToken;
  }

  async authenticateWithPassword(auth: UsernamePasswordAuth) {
    const { httpClient, apiEndpoint } = this.context;
    const { username, password } = auth;
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

  async authenticateServiceAccount(auth: ServiceAccountAuth) {
    const { httpClient, apiEndpoint } = this.context;
    const { client_id, client_secret } = auth;

    const params = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "client_credentials"
    });
    const url = `${apiEndpoint}/${SERVICE_ACCOUNT_LOGIN}`;

    this.accessToken = undefined;

    const { access_token } = await httpClient
      .request<{ access_token: string }>("POST", url, {
        retry: false,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      })
      .ready();

    this.accessToken = access_token;
  }

  async authenticate() {
    const options = this.options.auth || this.options;

    if ((options as AccessTokenAuth).accessToken) {
      this.authenticateWithToken(options as AccessTokenAuth);
      return;
    }
    if (
      (options as UsernamePasswordAuth).username &&
      (options as UsernamePasswordAuth).password
    ) {
      await this.authenticateWithPassword(options as UsernamePasswordAuth);
      return;
    }
    if (
      (options as ServiceAccountAuth).client_id &&
      (options as ServiceAccountAuth).client_secret
    ) {
      await this.authenticateServiceAccount(options as ServiceAccountAuth);
      return;
    }

    throw new Error("Please provide valid auth credentials");
  }
}
