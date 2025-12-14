import { Context, ConnectionOptions } from "../types";

/**
 * No-op authenticator for Firebolt Core connections.
 * Core doesn't require authentication, so all methods are no-ops.
 */
export class CoreAuthenticator {
  context: Context;
  options: ConnectionOptions;

  constructor(context: Context, options: ConnectionOptions) {
    context.httpClient.authenticator = this;
    this.context = context;
    this.options = options;
  }

  async getToken(): Promise<string | undefined> {
    return undefined;
  }

  async authenticate(): Promise<void> {
    // No-op for Core
  }

  async reAuthenticate(): Promise<void> {
    // No-op for Core
  }

  clearCache(): void {
    // No-op for Core
  }

  isUsernamePassword(): boolean {
    return false;
  }

  isServiceAccount(): boolean {
    return false;
  }

  isFireboltCore(): boolean {
    return true;
  }

  async addAuthHeaders(
    requestHeaders: Record<string, string>
  ): Promise<Record<string, string>> {
    // No-op for Core - no authentication needed
    return requestHeaders;
  }
}

