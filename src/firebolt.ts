import { Logger } from "./logger";
import { HttpClient } from "./http";
import { ResourceManager } from "./service";
import { FireboltCore } from "./core";
import { QueryFormatter } from "./formatter";
import { FireboltClientOptions } from "./types";

type Dependencies = {
  logger: Logger;
  httpClient: HttpClient;
};

const DEFAULT_API_ENDPOINT = "api.app.firebolt.io";

const getContext = (
  options: FireboltClientOptions,
  dependencies: Dependencies
) => {
  const {
    logger: loggerOptions,
    client: clientOptions,
    apiEndpoint = DEFAULT_API_ENDPOINT
  } = options;

  const { logger: DefaultLogger, httpClient: DefaultHttpClient } = dependencies;

  const logger =
    options.dependencies?.logger || new DefaultLogger(loggerOptions);

  const httpClient =
    options.dependencies?.httpClient || new DefaultHttpClient(clientOptions);

  const queryFormatter = new QueryFormatter();

  const context = {
    logger,
    httpClient,
    apiEndpoint,
    queryFormatter
  };
  return context;
};

export const FireboltClient = (dependencies: Dependencies) => {
  return (options: FireboltClientOptions = {}) => {
    const context = getContext(options, dependencies);

    const instanceContext = {
      ...context,
      resourceManager: new ResourceManager(context)
    };

    const instance = new FireboltCore(instanceContext, options);
    return instance;
  };
};

export const ResourceClient = (dependencies: Dependencies) => {
  return (options: FireboltClientOptions = {}) => {
    const context = getContext(options, dependencies);
    const resourceManager = new ResourceManager(context);
    return resourceManager;
  };
};
