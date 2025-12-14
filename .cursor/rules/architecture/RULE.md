---
alwaysApply: false
---
# Firebolt Node.js SDK Architecture Rules

## Version Architecture (Critical)

**V1 (Legacy)**: Username/password auth → `ConnectionV1`, `QueryFormatterV1`, `DatabaseServiceV1`, `EngineServiceV1`
**V2 (Current)**: Service account auth (client_id/secret) → `ConnectionV2`, `QueryFormatterV2`, `DatabaseServiceV2`, `EngineServiceV2`

Version selected in `makeConnection()` based on auth type. **Always support both versions** unless explicitly V2-only.

## Core Patterns

**Dependency Injection**: Factory functions (`FireboltClient()`, `ResourceClient()`) accept `logger` and `httpClient`, return configured instances. Context object passes dependencies.

**Abstract Base Classes**: `Connection` (base) → `ConnectionV1`/`ConnectionV2`. `QueryFormatter` (base) → `QueryFormatterV1`/`QueryFormatterV2`. Base classes contain shared logic.

**Statement Types**:
- `Statement`: `execute()` → `fetchResult()` (in-memory) or `streamResult()` (in-memory stream, not true streaming)
- `StreamStatement`: `executeStream()` → true server-side streaming
- `AsyncStatement`: `executeAsync()` → returns token, no immediate data

## Query Execution Flow

1. `prepareQuery()`: Format with `QueryFormatter` (handles `?`, `:name`, or `$1`/$2` for server-side)
2. `getRequestUrl()`: Add query params and settings
3. `executeQuery()`: POST to engine endpoint
4. `processHeaders()`: Update session parameters from response headers
5. Parse JSON, handle errors via `throwErrorIfErrorBody()`
6. Return appropriate Statement type

## Parameter Management

Connection maintains session parameters:
- **Immutable**: `database`, `account_id`, `output_format` (cannot be removed)
- **Mutable**: Updated via `SET` statements or response headers
- **Server headers**: `Firebolt-Update-Parameters`, `Firebolt-Update-Endpoint`, `Firebolt-Reset-Session`, `Firebolt-Remove-Parameters`

## Authentication & Caching

`Authenticator` handles OAuth tokens with thread-safe caching (read/write locks via `rwlock`). Cache key: `{clientId, secret, apiEndpoint}`. Tokens expire at 50% of actual expiry for safety. Disable with `useCache: false`.

## Engine Endpoint Resolution

**V2**: Get system engine URL → connect → `USE DATABASE` → `USE ENGINE` (if specified)
**V1**: Resolve account ID → get engine URL by database/engine → direct connection

## Error Handling

Use `CompositeError` for multiple errors. Custom errors: `AccountNotFoundError`, `AuthenticationError`, `ApiError` (from `src/common/errors.ts`).

## Important Details

- **Prepared statements**: `native` (default, client-side `?`/`:name`) vs `fb_numeric` (server-side `$1`/`$2`)
- **Transactions**: `begin()`, `commit()`, `rollback()` on Connection (state per connection)
- **Async queries**: `async: true` setting → token for `isAsyncQueryRunning()`, `isAsyncQuerySuccessful()`, `cancelAsyncQuery()`
- **Result hydration**: SQL types → JS types (dates, BigNumber for large ints, normalization)
- **Connection cleanup**: `destroy()` aborts all active requests
- **Response formats**: `JSON_COMPACT` (default), `JSON`, `JSON_LINES`

## Development Rules

1. Support both V1 and V2 unless V2-only feature
2. Use abstract base classes for shared functionality
3. Keep DI pattern for testability
4. Use custom error types from `src/common/errors.ts`
5. Maintain separate V1/V2 test suites
6. V1 is legacy; prioritize V2 for new features

