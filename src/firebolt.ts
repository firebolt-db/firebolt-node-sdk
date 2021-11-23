import { Logger } from "./logger";
import { HttpClient } from "./http";
import { Options } from "./options";
import { FireboltCore } from "./core";

type Depencencies = {
  logger: Logger;
  httpClient: HttpClient;
};

export const FireboltClient = (depencencies: Depencencies) => {
  return (options: Options) => {
    const { loggerOptions, clientOptions } = options;
    const { logger: DefaultLogger, httpClient: DefaultHttpClient } =
      depencencies;

    const logger =
      options.depencencies?.logger || new DefaultLogger(loggerOptions);

    const httpClient =
      options.depencencies?.httpClient || new DefaultHttpClient(clientOptions);

    const context = { logger, httpClient };
    const instance = new FireboltCore(context, options);
    return instance;
  };
};
