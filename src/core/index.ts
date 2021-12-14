import { Connection } from "../connection";
import { Authenticator } from "../auth";
import { Options } from "../options";
import { Context, ConnectionOptions } from "../types";

export class FireboltCore {
  private options: Options;
  private context: Context;

  constructor(context: Context, options: Options) {
    this.context = context;
    this.options = options;
  }

  async connect(connectionOptions: ConnectionOptions) {
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    await connection.resolveEngineEndpoint();
    return connection;
  }

  async testConnection(
    connectionOptions: ConnectionOptions
  ): Promise<{ success: boolean; error?: Error }> {
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    try {
      await auth.authenticate();
      await connection.resolveEngineEndpoint();
      await connection.execute("select 1");
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
}
