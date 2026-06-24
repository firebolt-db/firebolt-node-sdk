import {
  AuthOptions,
  ConnectionOptions,
  DiscoveryConnectionOptions,
  FireboltCoreAuth,
  LegacyConnectionOptions,
  ServiceAccountAuth,
  UsernamePasswordAuth
} from "../types";

export function isDiscoveryConnectionOptions(
  options: ConnectionOptions
): options is DiscoveryConnectionOptions {
  return "host" in options && typeof options.host === "string";
}

export function isLegacyConnectionOptions(
  options: ConnectionOptions
): options is LegacyConnectionOptions {
  return "auth" in options;
}

/**
 * Type guard to check if auth is FireboltCoreAuth
 */
export function isFireboltCoreAuth(
  auth: AuthOptions
): auth is FireboltCoreAuth {
  return (
    "type" in auth &&
    (auth as FireboltCoreAuth).type === "firebolt-core"
  );
}

/**
 * Type guard to check if auth is ServiceAccountAuth
 */
export function isServiceAccountAuth(
  auth: AuthOptions
): auth is ServiceAccountAuth {
  const serviceAuth = auth as ServiceAccountAuth;
  return !!(
    serviceAuth.client_id &&
    serviceAuth.client_secret
  );
}

/**
 * Type guard to check if auth is UsernamePasswordAuth
 */
export function isUsernamePasswordAuth(
  auth: AuthOptions
): auth is UsernamePasswordAuth {
  const usernameAuth = auth as UsernamePasswordAuth;
  return !!(
    usernameAuth.username &&
    usernameAuth.password
  );
}

