import { makeConnection } from "../connection";
import { Authenticator } from "../auth";
import { Context, ConnectionOptions, FireboltClientOptions } from "../types";
import { ResourceManager } from "../service";
import { NodeHttpClient } from "../http/node";

export class FireboltCore {
  private options: FireboltClientOptions;
  private context: Context;
  resourceManager!: ResourceManager;

  constructor(context: Context, options: FireboltClientOptions) {
    this.context = context;
    this.options = options;
  }

  async connect(connectionOptions: ConnectionOptions) {
    // Create a new httpClient instance for each connection
    const httpClient = new NodeHttpClient();

    // Create a new context with the new httpClient
    const connectionContext = {
      ...this.context,
      httpClient
    };

    const auth = new Authenticator(connectionContext, connectionOptions);
    const connection = makeConnection(connectionContext, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    const resourceContext = {
      connection,
      ...connectionContext
    };
    this.resourceManager = new ResourceManager(resourceContext);
    return connection;
  }

  async testConnection(connectionOptions: ConnectionOptions) {
    // Create a new httpClient instance for test connection too
    const httpClient = new NodeHttpClient();

    // Create a new context with the new httpClient
    const connectionContext = {
      ...this.context,
      httpClient
    };

    const auth = new Authenticator(connectionContext, connectionOptions);
    const connection = makeConnection(connectionContext, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    await connection.testConnection();
  }
}
