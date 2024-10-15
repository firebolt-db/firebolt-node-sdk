import { makeConnection } from "../connection";
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
    const connection = makeConnection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    const context = {
      connection,
      ...this.context
    };
    this.resourceManager = new ResourceManager(context);
    return connection;
  }

  async testConnection(connectionOptions: ConnectionOptions) {
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = makeConnection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    // auto_start_stop_control is only available for v2
    const settings = auth.isServiceAccount()
      ? { internal: [{ auto_start_stop_control: "ignore" }] }
      : {};
    await connection.execute("select 1", { settings });
  }
}
