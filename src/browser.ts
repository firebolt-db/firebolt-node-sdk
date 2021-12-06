// browser entry point
import { FireboltClient } from "./firebolt";
import { HttpClient } from "./http/browser";
import { Logger } from "./logger/browser";

export const Firebolt = FireboltClient({
  logger: Logger,
  httpClient: HttpClient
});
