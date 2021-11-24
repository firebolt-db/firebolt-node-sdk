import { Context } from "../context";
import { Connection, ConnectionOptions } from "../connection";
import { Authenticator } from "../auth";
import { Options } from "../options";

export class FireboltCore {
  options: Options;
  context: Context;
  connection!: Connection;

  constructor(context: Context, options: Options) {
    this.context = context;
    this.options = options;
  }

  async connect(connectionOptions: ConnectionOptions) {
    const auth = new Authenticator(this.context, connectionOptions);
    const connection = new Connection(this.context, connectionOptions);
    await auth.authenticate();
    this.connection = connection;
    return connection;
  }
}
