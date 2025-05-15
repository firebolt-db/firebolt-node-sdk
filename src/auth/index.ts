import { SERVICE_ACCOUNT_LOGIN, USERNAME_PASSWORD_LOGIN } from "../common/api";
import { assignProtocol } from "../common/util";
import {
  Context,
  ConnectionOptions,
  ServiceAccountAuth,
  UsernamePasswordAuth
} from "../types";
import {
  TokenKey,
  inMemoryCache,
  noneCache,
  rwLock
} from "../common/tokenCache";

type Login = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type TokenInfo = {
  access_token: string;
  // seconds until expiration
  expires_in: number;
};

const AUTH_AUDIENCE = "https://api.firebolt.io";
const AUTH_GRANT_TYPE = "client_credentials";

export class Authenticator {
  context: Context;
  options: ConnectionOptions;

  accessToken?: string;
  // Expiration time is half way to the actual expiration time
  // to allow for some buffer time before the token expires
  tokenExpirationTime?: number;

  constructor(context: Context, options: ConnectionOptions) {
    context.httpClient.authenticator = this;
    this.context = context;
    this.options = options;
  }

  private getCacheKey(): TokenKey | undefined {
    if (this.isUsernamePassword()) {
      const auth = this.options.auth as UsernamePasswordAuth;
      return {
        clientId: auth.username,
        secret: auth.password,
        apiEndpoint: this.context.apiEndpoint
      };
    } else if (this.isServiceAccount()) {
      const auth = this.options.auth as ServiceAccountAuth;
      return {
        clientId: auth.client_id,
        secret: auth.client_secret,
        apiEndpoint: this.context.apiEndpoint
      };
    }
    return undefined;
  }

  private getCache() {
    return this.options.useCache ?? true
      ? inMemoryCache.tokenStorage
      : noneCache.tokenStorage;
  }

  clearCache() {
    const key = this.getCacheKey();
    key && this.getCache().clear(key);
  }

  private setToken(token: string, expiresIn: number) {
    // Set expiration to half of the expiresIn value
    // to allow for some buffer time before the token expires
    const expirationTimeMs = Date.now() + (expiresIn * 1000) / 2;
    this.accessToken = token;
    this.tokenExpirationTime = expirationTimeMs;
    // Update cache
    const key = this.getCacheKey();
    key &&
      this.getCache().set(key, { token, tokenExpiryTimeMs: expirationTimeMs });
  }

  private getCachedTokenInfo():
    | { token: string; tokenExpiryTimeMs: number }
    | undefined {
    const key = this.getCacheKey();
    if (!key) return undefined;

    const cachedTokenInfo = this.getCache().get(key);
    // Check if token exists and is not expired
    if (cachedTokenInfo && Date.now() < cachedTokenInfo.tokenExpiryTimeMs) {
      return {
        token: cachedTokenInfo.token,
        tokenExpiryTimeMs: cachedTokenInfo.tokenExpiryTimeMs
      };
    }

    return undefined;
  }

  async getToken(): Promise<string | undefined> {
    if (this.tokenExpirationTime && this.tokenExpirationTime < Date.now()) {
      await this.authenticate();
    }
    return this.accessToken;
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

  private async authenticateUsernamePassword(
    auth: UsernamePasswordAuth
  ): Promise<TokenInfo> {
    const { httpClient, apiEndpoint } = this.context;
    const { username, password } = auth;
    const url = `${apiEndpoint}/${USERNAME_PASSWORD_LOGIN}`;
    const body = JSON.stringify({
      username,
      password
    });

    // Expiration is in seconds
    const { access_token, expires_in } = await httpClient
      .request<Login>("POST", url, {
        body,
        retry: false,
        noAuth: true
      })
      .ready();

    return { access_token, expires_in };
  }

  private async authenticateServiceAccount(
    auth: ServiceAccountAuth
  ): Promise<TokenInfo> {
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

    // Expiration is in seconds
    const { access_token, expires_in } = await httpClient
      .request<Login>("POST", url, {
        retry: false,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params,
        noAuth: true
      })
      .ready();

    return { access_token, expires_in };
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

  async authenticate(): Promise<void> {
    // Try to get token from cache using read lock
    const cachedToken = await this.tryGetCachedToken();
    if (cachedToken) {
      this.accessToken = cachedToken.token;
      this.tokenExpirationTime = cachedToken.tokenExpiryTimeMs;
      return;
    }
    // No cached token, acquire write lock and authenticate
    await this.acquireWriteLockAndAuthenticate();
  }

  async reAuthenticate(): Promise<void> {
    // Acquire write lock, clear cache and authenticate
    return new Promise((resolve, reject) => {
      rwLock.writeLock(async releaseWriteLock => {
        try {
          // Clear the cache under write lock
          const key = this.getCacheKey();
          key && this.getCache().clear(key);

          // Perform authentication directly rather than calling acquireWriteLockAndAuthenticate
          // since we already have the write lock
          await this.performAuthentication();

          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
          releaseWriteLock();
        }
      });
    });
  }

  private async tryGetCachedToken(): Promise<
    { token: string; tokenExpiryTimeMs: number } | undefined
  > {
    return new Promise((resolve, reject) => {
      rwLock.readLock(releaseReadLock => {
        try {
          const cachedToken = this.getCachedTokenInfo();
          resolve(cachedToken);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
          releaseReadLock();
        }
      });
    });
  }

  private async acquireWriteLockAndAuthenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      rwLock.writeLock(async releaseWriteLock => {
        try {
          // Double-check cache in case another thread authenticated while waiting
          const cachedTokenInfo = this.getCachedTokenInfo();
          if (cachedTokenInfo) {
            this.accessToken = cachedTokenInfo.token;
            this.tokenExpirationTime = cachedTokenInfo.tokenExpiryTimeMs;
            return resolve();
          }
          await this.performAuthentication();

          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
          releaseWriteLock();
        }
      });
    });
  }

  private async performAuthentication(): Promise<void> {
    const options = this.options.auth || this.options;

    let auth: TokenInfo;

    if (this.isUsernamePassword()) {
      auth = await this.authenticateUsernamePassword(
        options as UsernamePasswordAuth
      );
    } else if (this.isServiceAccount()) {
      auth = await this.authenticateServiceAccount(
        options as ServiceAccountAuth
      );
    } else {
      throw new Error("Please provide valid auth credentials");
    }

    this.setToken(auth.access_token, auth.expires_in);
  }
}
