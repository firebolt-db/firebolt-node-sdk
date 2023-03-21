import { Connection } from "../connection";
import { Authenticator } from "../auth";
import { Context, ConnectionOptions, FireboltClientOptions } from "../types";
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

  async connect(connectionOptions: ConnectionOptions) {
    const { account } = connectionOptions;
    this.resourceManager.account.name = account;
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    return connection;
  }

  async testConnection(connectionOptions: ConnectionOptions) {
    const { account } = connectionOptions;
    this.resourceManager.account.name = account;
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    await connection.execute("select 1");
  }
}
