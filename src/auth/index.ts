import { SERVICE_ACCOUNT_LOGIN } from "../common/api";
import { assignProtocol } from "../common/util";
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

const AUTH_AUDIENCE = "https://api.firebolt.io";
const AUTH_GRANT_TYPE = "client_credentials";

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

  getAuthEndpoint(apiEndpoint: string) {
    const myURL = new URL(assignProtocol(apiEndpoint));
    const hostStrings = myURL.hostname.split(".");
    // We expect an apiEndpoint to be of format api.<env>.firebolt.io
    // Since we got something else, assume it's a test
    if (hostStrings[0] != "api") {
      return new URL(assignProtocol(apiEndpoint)).toString();
    }
    hostStrings[0] = "id";
    myURL.hostname = hostStrings.join(".");
    return myURL.toString();
  }

  async authenticateServiceAccount(auth: ClientCredentialsAuth) {
    const { httpClient, apiEndpoint } = this.context;
    const { client_id, client_secret } = auth;

    const authEndpoint = this.getAuthEndpoint(apiEndpoint);
    const params = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: AUTH_GRANT_TYPE,
      audience: AUTH_AUDIENCE
    });
    const url = `${authEndpoint}${SERVICE_ACCOUNT_LOGIN}`;

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
