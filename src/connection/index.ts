import {
  Context,
  ConnectionOptions,
  ServiceAccountAuth,
  UsernamePasswordAuth
} from "../types";
import { ConnectionV1 } from "./connection_v1";
import { ConnectionV2 } from "./connection_v2";

export type { Connection } from "./base";

export function makeConnection(context: Context, options: ConnectionOptions) {
  if (
    (options.auth as ServiceAccountAuth).client_id &&
    (options.auth as ServiceAccountAuth).client_secret
  ) {
    return new ConnectionV2(context, options);
  } else if (
    (options.auth as UsernamePasswordAuth).username &&
    (options.auth as UsernamePasswordAuth).password
  ) {
    return new ConnectionV1(context, options);
  }
  throw new Error("Invalid auth options");
}
