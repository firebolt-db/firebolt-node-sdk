import { Logger } from "./logger";
import { HttpClient } from "./http";
import { ResourceManager } from "./service";
import { FireboltCore } from "./core";
import { QueryFormatter } from "./formatter";
import { FireboltClientOptions, ResourceManagerOptions } from "./types";

type Dependencies = {
  logger: Logger;
  httpClient: HttpClient;
};

type ResourceManagerDependencies = {
  logger: Logger;
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

const getResourceContext = (
  options: ResourceManagerOptions,
  dependencies: ResourceManagerDependencies
) => {
  const { logger: loggerOptions, connection } = options;
  const { logger: DefaultLogger } = dependencies;

  const logger =
    options.dependencies?.logger || new DefaultLogger(loggerOptions);

  const context = {
    logger,
    connection
  };
  return context;
};

export const FireboltClient = (dependencies: Dependencies) => {
  return (options: FireboltClientOptions = {}) => {
    const context = getContext(options, dependencies);

    const instance = new FireboltCore(context, options);
    return instance;
  };
};

export const ResourceClient = (dependencies: Dependencies) => {
  return (options: ResourceManagerOptions) => {
    const context = getResourceContext(options, dependencies);
    const resourceManager = new ResourceManager(context);
    return resourceManager;
  };
};
