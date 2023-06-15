import { HttpClientInterface } from "../http";
import { LoggerInterface } from "../logger";
import { DatabaseService } from "./database";
import { EngineService } from "./engine";
import { AccountService } from "./account";
import { Authenticator } from "../auth";
import { QueryFormatter } from "../formatter";
import { ConnectionOptions, RMContext } from "../types";
import { Connection } from "../connection";
import { FireboltCore } from "../core";

export class ResourceManager {
  private context: RMContext;
  accountName!: string;
  engine: EngineService;
  database: DatabaseService;
  account: AccountService;

  constructor(
    context: {
      httpClient: HttpClientInterface;
      logger: LoggerInterface;
      queryFormatter: QueryFormatter;
      apiEndpoint: string;
    },
    connection: Connection | undefined = undefined
  ) {
    this.context = {
      ...context,
      resourceManager: this,
      connection: connection
    };
    this.engine = new EngineService(this.context);
    this.database = new DatabaseService(this.context);
    this.account = new AccountService(this.context);
    if (connection) {
      this.addConnectionToServices(connection);
    }
  }

  private addConnectionToServices(connection: Connection) {
    this.engine.connection = connection;
    this.database.connection = connection;
    this.account.connection = connection;
  }

  async authenticate(options: ConnectionOptions) {
    const { account } = options;
    this.accountName = account;
    const auth = new Authenticator(this.context, options);
    await auth.authenticate();
    const core = new FireboltCore(this.context, {});
    this.context.connection = await core.connect(options);
    this.addConnectionToServices(this.context.connection);
  }
}
