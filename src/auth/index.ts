import { SERVICE_ACCOUNT_LOGIN } from "../common/api";
import {
  Context,
  ConnectionOptions,
  ClientCredentialsAuth,
  AccessTokenAuth
} from "../types";

type Login = {
  access_token: string;
  token_type: string;
  expires_in: number;
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

  authenticateWithToken(auth: AccessTokenAuth) {
    const { accessToken } = auth;
    this.accessToken = accessToken;
  }

  async authenticateServiceAccount(auth: ClientCredentialsAuth) {
    const { httpClient, apiEndpoint, env } = this.context;
    const { client_id, client_secret } = auth;

    const params = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "client_credentials",
      audience: apiEndpoint
    });
    const url = `id.${env}.firebolt.io/${SERVICE_ACCOUNT_LOGIN}`;

    this.accessToken = undefined;

    const { access_token } = await httpClient
      .request<Login>("POST", url, {
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
      (options as ClientCredentialsAuth).client_id &&
      (options as ClientCredentialsAuth).client_secret
    ) {
      await this.authenticateServiceAccount(options as ClientCredentialsAuth);
      return;
    }

    throw new Error("Please provide valid auth credentials");
  }
}
