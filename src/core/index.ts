import { Connection } from "../connection";
import { Authenticator } from "../auth";
import { Context, ConnectionOptions, FireboltClientOptions } from "../types";
import { checkArgumentExists } from "../common/util";
import {
  MISSING_ENGINE_ENDPOINT,
  MISSING_PASSWORD,
  MISSING_USERNAME
} from "../common/errors";
import { ResourceManager } from "../service";

export class FireboltCore {
  private options: FireboltClientOptions;
  private context: Context;
  resourceManager: ResourceManager;

  constructor(context: Context, options: FireboltClientOptions) {
    this.context = context;
    this.options = options;
    this.resourceManager = context.resourceManager;
  }

  checkConnectionOptions(connectionOptions: ConnectionOptions) {
    checkArgumentExists(connectionOptions.username, MISSING_USERNAME);
    checkArgumentExists(connectionOptions.password, MISSING_PASSWORD);
    checkArgumentExists(
      connectionOptions.engineEndpoint || connectionOptions.engineName,
      MISSING_ENGINE_ENDPOINT
    );
  }

  async connect(connectionOptions: ConnectionOptions) {
    this.checkConnectionOptions(connectionOptions);
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    return connection;
  }

  async testConnection(connectionOptions: ConnectionOptions) {
    this.checkConnectionOptions(connectionOptions);
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    await connection.execute("select 1");
  }
}
