import { Context } from "../context";
import { Connection, ConnectionOptions } from "../connection";
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
    const connection = new Connection(this.context, connectionOptions);
    this.connection = connection;
    await connection.connect();
    return connection;
  }
}
