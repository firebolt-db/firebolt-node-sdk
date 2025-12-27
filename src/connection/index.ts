import { Context, ConnectionOptions } from "../types";
import { ConnectionV1 } from "./connection_v1";
import { ConnectionV2 } from "./connection_v2";
import { ConnectionCore } from "./connection_core";
import { QueryFormatterV1 } from "../formatter/formatter_v1";
import { QueryFormatterV2 } from "../formatter/formatter_v2";
import {
  isFireboltCoreAuth,
  isServiceAccountAuth,
  isUsernamePasswordAuth
} from "../common/auth";

export type { Connection } from "./base";

export function makeConnection(context: Context, options: ConnectionOptions) {
  if (isFireboltCoreAuth(options.auth)) {
    const queryFormatter = new QueryFormatterV2();
    return new ConnectionCore(queryFormatter, context, options);
  } else if (isServiceAccountAuth(options.auth)) {
    const queryFormatter = new QueryFormatterV2();
    return new ConnectionV2(queryFormatter, context, options);
  } else if (isUsernamePasswordAuth(options.auth)) {
    const queryFormatter = new QueryFormatterV1();
    return new ConnectionV1(queryFormatter, context, options);
  }
  throw new Error("Invalid auth options");
}
