import { makeConnection } from "../connection";
import { Authenticator } from "../auth/managed";
import { CoreAuthenticator } from "../auth/core";
import {
  Context,
  ConnectionOptions,
  FireboltClientOptions,
  FireboltCoreAuth
} from "../types";
import { ResourceManager } from "../service";
import { NodeHttpClient } from "../http/node";

export class FireboltClient {
  private options: FireboltClientOptions;
  private context: Context;
  private _resourceManager?: ResourceManager;

  constructor(context: Context, options: FireboltClientOptions) {
    this.context = context;
    this.options = options;
  }

  /**
   * Getter for resourceManager that preserves backward compatibility.
   * For managed Firebolt connections, this is always defined.
   * For Firebolt Core connections, accessing this will throw an error.
   */
  get resourceManager(): ResourceManager {
    if (!this._resourceManager) {
      throw new Error(
        "ResourceManager is not available for Firebolt Core connections. " +
        "Use managed Firebolt authentication (client_id/client_secret) to access ResourceManager."
      );
    }
    return this._resourceManager;
  }

  private async prepareConnection(connectionOptions: ConnectionOptions) {
    // Create a new httpClient instance for each connection
    const httpClient =
      this.options.dependencies?.httpClient || new NodeHttpClient();

    // Create a new context with the new httpClient
    const connectionContext = {
      ...this.context,
      httpClient
    };

    // Use CoreAuthenticator for Core, regular Authenticator for managed Firebolt
    const auth =
      "type" in connectionOptions.auth &&
      (connectionOptions.auth as FireboltCoreAuth).type === "firebolt-core"
        ? new CoreAuthenticator(connectionContext, connectionOptions)
        : new Authenticator(connectionContext, connectionOptions);

    const connection = makeConnection(connectionContext, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();

    return { connection, connectionContext };
  }

  async connect(connectionOptions: ConnectionOptions) {
    const { connection, connectionContext } = await this.prepareConnection(
      connectionOptions
    );

    // Only create ResourceManager for managed Firebolt (not Core)
    if (
      !("type" in connectionOptions.auth) ||
      (connectionOptions.auth as FireboltCoreAuth).type !== "firebolt-core"
    ) {
      const resourceContext = {
        connection,
        ...connectionContext
      };
      this._resourceManager = new ResourceManager(resourceContext);
    }

    return connection;
  }

  async testConnection(connectionOptions: ConnectionOptions) {
    const { connection } = await this.prepareConnection(connectionOptions);
    await connection.testConnection();
  }
}
