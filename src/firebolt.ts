import { Logger } from "./logger";
import { HttpClient } from "./http";
import { ResourceManager } from "./service";
import { FireboltCore } from "./core";
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

  const context = {
    logger,
    httpClient,
    apiEndpoint
  };
  return context;
};

export const FireboltClient = (dependencies: Dependencies) => {
  return (options: FireboltClientOptions = {}) => {
    const context = getContext(options, dependencies);

    return new FireboltCore(context, options);
  };
};

export const ResourceClient = (dependencies: Dependencies) => {
  return (options: ResourceManagerOptions) => {
    const { connection } = options;
    const context = {
      connection,
      ...getContext(options, dependencies),
      // make sure to use already authenticated client from connection
      httpClient: connection.httpClient
    };
    return new ResourceManager(context);
  };
};
