import {
  Context,
  ConnectionOptions,
  ServiceAccountAuth,
  UsernamePasswordAuth
} from "../types";
import { ConnectionV1 } from "./connection_v1";
import { ConnectionV2 } from "./connection_v2";
import { QueryFormatterV1 } from "../formatter/formatter_v1";
import { QueryFormatterV2 } from "../formatter/formatter_v2";

export type { Connection } from "./base";

export function makeConnection(context: Context, options: ConnectionOptions) {
  if (
    (options.auth as ServiceAccountAuth).client_id &&
    (options.auth as ServiceAccountAuth).client_secret
  ) {
    const queryFormatter = new QueryFormatterV2();
    return new ConnectionV2(queryFormatter, context, options);
  } else if (
    (options.auth as UsernamePasswordAuth).username &&
    (options.auth as UsernamePasswordAuth).password
  ) {
    const queryFormatter = new QueryFormatterV1();
    return new ConnectionV1(queryFormatter, context, options);
  }
  throw new Error("Invalid auth options");
}
