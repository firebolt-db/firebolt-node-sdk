import { Logger } from "./logger";
import { HttpClient } from "./http";
import { Options } from "./options";
import { FireboltCore } from "./core";

type Dependencies = {
  logger: Logger;
  httpClient: HttpClient;
};

export const FireboltClient = (dependencies: Dependencies) => {
  return (options: Options) => {
    const { loggerOptions, clientOptions } = options;
    const { logger: DefaultLogger, httpClient: DefaultHttpClient } =
      dependencies;

    const logger =
      options.dependencies?.logger || new DefaultLogger(loggerOptions);

    const httpClient =
      options.dependencies?.httpClient || new DefaultHttpClient(clientOptions);

    const context = { logger, httpClient };
    const instance = new FireboltCore(context, options);
    return instance;
  };
};
