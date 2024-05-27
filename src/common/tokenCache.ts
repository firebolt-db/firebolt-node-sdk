export type TokenRecord = {
  token: string;
  expiration: number;
};

export interface TokenCache {
  getCachedToken(clientId: string, secret: string): TokenRecord | null;
  cacheToken(
    clientId: string,
    secret: string,
    token: string,
    expiresIn: number
  ): void;
  clearCachedToken(clientId: string, secret: string): void;
}

export class NoneCache implements TokenCache {
  getCachedToken(clientId: string, secret: string): TokenRecord | null {
    return null;
  }

  cacheToken(
    clientId: string,
    secret: string,
    token: string,
    expiresIn: number
  ): void {
    // Do nothing
  }

  clearCachedToken(): void {
    // Do nothing
  }
}

export class InMemoryCache implements TokenCache {
  private storage: Record<string, TokenRecord> = {};

  private makeKey(clientId: string, secret: string): string {
    return `${clientId}:${secret}`;
  }

  private isExpired(record: TokenRecord): boolean {
    return record && Date.now() > record.expiration;
  }

  getCachedToken(clientId: string, secret: string): TokenRecord | null {
    const key = this.makeKey(clientId, secret);
    const record = this.storage[key];
    if (this.isExpired(record)) {
      this.clearCachedToken(clientId, secret);
      return null;
    }
    return record;
  }

  cacheToken(
    clientId: string,
    secret: string,
    token: string,
    expiresIn: number
  ): void {
    const key = this.makeKey(clientId, secret);
    const expiration = Date.now() + expiresIn * 1000;
    this.storage[key] = {
      token,
      expiration
    };
  }

  clearCachedToken(clientId: string, secret: string): void {
    const key = this.makeKey(clientId, secret);
    delete this.storage[key];
  }
}

export const inMemoryCache = new InMemoryCache();
export const noneCache = new NoneCache();
