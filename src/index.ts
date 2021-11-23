//node entry point
import { FireboltClient } from "./firebolt";
import { NodeHttpClient } from "./http/node";
import { Logger } from "./logger/node";

export const Firebolt = FireboltClient({
  logger: Logger,
  httpClient: NodeHttpClient
});
