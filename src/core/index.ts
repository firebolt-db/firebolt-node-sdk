import { Connection, ConnectionOptions } from "../connection";
import { Authenticator } from "../auth";
import { Options } from "../options";
import { Context } from "../types";

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
    return connection;
  }
}
