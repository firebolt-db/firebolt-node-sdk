import { SERVICE_ACCOUNT_LOGIN, USERNAME_PASSWORD_LOGIN } from "../common/api";
import { assignProtocol } from "../common/util";
import {
  Context,
  ConnectionOptions,
  ServiceAccountAuth,
  UsernamePasswordAuth
} from "../types";
import { inMemoryCache, noneCache } from "../common/tokenCache";

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

  constructor(context: Context, options: ConnectionOptions) {
    context.httpClient.authenticator = this;
    this.context = context;
    this.options = options;
  }

  private getCacheKeys() {
    let clientId, secret;
    if (this.isUsernamePassword()) {
      const auth = this.options.auth as UsernamePasswordAuth;
      [clientId, secret] = [auth.username, auth.password];
    } else if (this.isServiceAccount()) {
      const auth = this.options.auth as ServiceAccountAuth;
      [clientId, secret] = [auth.client_id, auth.client_secret];
    }
    return { clientId, secret };
  }

  private getCache() {
    return this.options.useCache ?? true ? inMemoryCache : noneCache;
  }

  clearCache() {
    const { clientId, secret } = this.getCacheKeys();
    if (!clientId || !secret) {
      return;
    }
    this.getCache().clearCachedToken(clientId, secret);
  }

  private setToken(token: string, expiresIn: number) {
    this.accessToken = token;

    const { clientId, secret } = this.getCacheKeys();
    if (!clientId || !secret) {
      return;
    }
    this.getCache().cacheToken(clientId, secret, token, expiresIn);
  }

  private getCachedToken() {
    const { clientId, secret } = this.getCacheKeys();
    if (!clientId || !secret) {
      return;
    }
    return this.getCache().getCachedToken(clientId, secret)?.token;
  }

  getHeaders() {
    if (this.accessToken) {
      return {
        Authorization: `Bearer ${this.accessToken}`
      };
    }
    return {};
  }

  private static getAuthEndpoint(apiEndpoint: string) {
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

  private async authenticateUsernamePassword(auth: UsernamePasswordAuth) {
    const { httpClient, apiEndpoint } = this.context;
    const { username, password } = auth;
    const url = `${apiEndpoint}/${USERNAME_PASSWORD_LOGIN}`;
    const body = JSON.stringify({
      username,
      password
    });

    this.accessToken = undefined;

    const { access_token, expires_in } = await httpClient
      .request<Login>("POST", url, {
        body,
        retry: false
      })
      .ready();

    this.setToken(access_token, expires_in);
  }

  private async authenticateServiceAccount(auth: ServiceAccountAuth) {
    const { httpClient, apiEndpoint } = this.context;
    const { client_id, client_secret } = auth;

    const authEndpoint = Authenticator.getAuthEndpoint(apiEndpoint);
    const params = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: AUTH_GRANT_TYPE,
      audience: AUTH_AUDIENCE
    });
    const url = `${authEndpoint}${SERVICE_ACCOUNT_LOGIN}`;

    this.accessToken = undefined;

    const { access_token, expires_in } = await httpClient
      .request<Login>("POST", url, {
        retry: false,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      })
      .ready();

    this.setToken(access_token, expires_in);
  }

  isUsernamePassword() {
    const options = this.options.auth || this.options;
    return !!(
      (options as UsernamePasswordAuth).username &&
      (options as UsernamePasswordAuth).password
    );
  }

  isServiceAccount() {
    const options = this.options.auth || this.options;
    return !!(
      (options as ServiceAccountAuth).client_id &&
      (options as ServiceAccountAuth).client_secret
    );
  }

  async authenticate() {
    const options = this.options.auth || this.options;
    const cachedToken = this.getCachedToken();
    if (cachedToken) {
      this.accessToken = cachedToken;
      return;
    }

    if (this.isUsernamePassword()) {
      await this.authenticateUsernamePassword(options as UsernamePasswordAuth);
      return;
    }
    if (this.isServiceAccount()) {
      await this.authenticateServiceAccount(options as ServiceAccountAuth);
      return;
    }

    throw new Error("Please provide valid auth credentials");
  }
}
