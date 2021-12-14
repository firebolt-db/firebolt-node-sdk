import { Logger } from "./logger";
import { HttpClient } from "./http";
import { Options } from "./options";
import { ResourceManager } from "./service";
import { FireboltCore } from "./core";

type Dependencies = {
  logger: Logger;
  httpClient: HttpClient;
};

const DEFAULT_API_ENDPOINT = "api.firebolt.io";

export const FireboltClient = (dependencies: Dependencies) => {
  return (options: Options = {}) => {
    const {
      logger: loggerOptions,
      client: clientOptions,
      apiEndpoint = DEFAULT_API_ENDPOINT
    } = options;

    const { logger: DefaultLogger, httpClient: DefaultHttpClient } =
      dependencies;

    const logger =
      options.dependencies?.logger || new DefaultLogger(loggerOptions);

    const httpClient =
      options.dependencies?.httpClient || new DefaultHttpClient(clientOptions);

    const context = {
      logger,
      httpClient,
      apiEndpoint
    };

    const instanceContext = {
      ...context,
      resourceManager: new ResourceManager(context)
    };

    const instance = new FireboltCore(instanceContext, options);

    return instance;
  };
};
