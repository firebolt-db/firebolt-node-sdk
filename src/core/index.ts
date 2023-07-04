import { Connection } from "../connection";
import { Authenticator } from "../auth";
import { Context, ConnectionOptions, FireboltClientOptions } from "../types";
import { ResourceManager } from "../service";

export class FireboltCore {
  private options: FireboltClientOptions;
  private context: Context;
  resourceManager!: ResourceManager;

  constructor(context: Context, options: FireboltClientOptions) {
    this.context = context;
    this.options = options;
  }

  async connect(connectionOptions: ConnectionOptions) {
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    this.resourceManager = new ResourceManager({
      logger: this.context.logger,
      connection
    });
    return connection;
  }

  async testConnection(connectionOptions: ConnectionOptions) {
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    await connection.execute("select 1");
  }
}
