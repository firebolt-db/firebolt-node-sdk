export type TokenRecord = {
  token: string;
  expiration: number;
};

export type CacheKey = {
  clientId: string;
  secret: string;
  apiEndpoint: string;
};

export interface TokenCache {
  getCachedToken(key: CacheKey): TokenRecord | null;
  cacheToken(key: CacheKey, token: string, expiresIn: number): void;
  clearCachedToken(key: CacheKey): void;
}

export class NoneCache implements TokenCache {
  getCachedToken(key: CacheKey): TokenRecord | null {
    return null;
  }

  cacheToken(key: CacheKey, token: string, expiresIn: number): void {
    // Do nothing
  }

  clearCachedToken(key: CacheKey): void {
    // Do nothing
  }
}

export class InMemoryCache implements TokenCache {
  private storage: Record<string, TokenRecord> = {};

  private makeLookupString(key: CacheKey): string {
    return `${key.clientId}:${key.secret}:${key.apiEndpoint}`;
  }

  private isExpired(record: TokenRecord): boolean {
    return record && Date.now() > record.expiration;
  }

  getCachedToken(key: CacheKey): TokenRecord | null {
    const lookup = this.makeLookupString(key);
    const record = this.storage[lookup];
    if (this.isExpired(record)) {
      this.clearCachedToken(key);
      return null;
    }
    return record;
  }

  cacheToken(key: CacheKey, token: string, expiresIn: number): void {
    const lookup = this.makeLookupString(key);
    const expiration = Date.now() + expiresIn * 1000;
    this.storage[lookup] = {
      token,
      expiration
    };
  }

  clearCachedToken(key: CacheKey): void {
    const lookup = this.makeLookupString(key);
    delete this.storage[lookup];
  }
}

export const inMemoryCache = new InMemoryCache();
export const noneCache = new NoneCache();
