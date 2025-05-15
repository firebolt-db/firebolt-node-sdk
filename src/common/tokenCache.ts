import ReadWriteLock from "rwlock";
import { AccountInfo } from "../connection/connection_v1";

export type TokenKey = {
  clientId: string;
  secret: string;
  apiEndpoint: string;
};

export type TokenRecord = {
  token: string;
  tokenExpiryTimeMs: number;
};

export type AccountKey = {
  account: string;
  apiEndpoint: string;
};

export type AccountEngineRecord = {
  engineUrl: string;
  params: Record<string, string>;
};

export interface CacheStorage<KeyType, RecordType> {
  get(key: KeyType): RecordType | null;
  set(key: KeyType, record: RecordType): void;
  clear(key: KeyType): void;
}

export class NoneCacheStorage<KeyType, RecordType>
  implements CacheStorage<KeyType, RecordType>
{
  get(key: KeyType): RecordType | null {
    return null;
  }

  set(key: KeyType, record: RecordType): void {
    // Do nothing
  }

  clear(key: KeyType): void {
    // Do nothing
  }
}

export class InMemoryCacheStorage<KeyType, RecordType> {
  private storage: Record<string, RecordType> = {};

  private makeLookupString(key: KeyType): string {
    return JSON.stringify(key);
  }

  protected isValidRecord(record: RecordType | undefined): boolean {
    return true;
  }

  protected modifyRecord(record: RecordType): RecordType {
    return record;
  }

  get(key: KeyType): RecordType | null {
    const lookup = this.makeLookupString(key);
    const record = this.storage[lookup];
    if (!this.isValidRecord(record)) {
      return null;
    }
    return record;
  }

  set(key: KeyType, record: RecordType): void {
    const lookup = this.makeLookupString(key);
    this.storage[lookup] = this.modifyRecord(record);
  }

  clear(key: KeyType): void {
    const lookup = this.makeLookupString(key);
    delete this.storage[lookup];
  }
}

export class InMemoryTokenCacheStorage extends InMemoryCacheStorage<
  TokenKey,
  TokenRecord
> {
  protected isValidRecord(record: TokenRecord | undefined): boolean {
    return (
      typeof record != "undefined" && Date.now() < record.tokenExpiryTimeMs
    );
  }

  protected modifyRecord(record: TokenRecord): TokenRecord {
    return record;
  }
}

export interface Cache {
  tokenStorage: CacheStorage<TokenKey, TokenRecord>;
  accountInfoStorage: CacheStorage<AccountKey, AccountInfo>;
  engineUrlStorage: CacheStorage<AccountKey, AccountEngineRecord>;
}

export class NoneCache implements Cache {
  tokenStorage = new NoneCacheStorage<TokenKey, TokenRecord>();
  accountInfoStorage = new NoneCacheStorage<AccountKey, AccountInfo>();
  engineUrlStorage = new NoneCacheStorage<AccountKey, AccountEngineRecord>();
}

export class InMemoryCache implements Cache {
  tokenStorage = new InMemoryTokenCacheStorage();
  accountInfoStorage = new InMemoryCacheStorage<AccountKey, AccountInfo>();
  engineUrlStorage = new InMemoryCacheStorage<
    AccountKey,
    AccountEngineRecord
  >();
}

export const inMemoryCache = new InMemoryCache();
export const noneCache = new NoneCache();
export const rwLock = new ReadWriteLock();
