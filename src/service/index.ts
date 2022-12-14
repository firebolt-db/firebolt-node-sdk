import { HttpClientInterface } from "../http";
import { LoggerInterface } from "../logger";
import { DatabaseService } from "./database";
import { EngineService } from "./engine";
import { AccountService } from "./account";
import { Authenticator } from "../auth";
import { QueryFormatter } from "../formatter";
import { AuthOptions, Context } from "../types";
import { authDeprecationWarning } from "../common/errors";

export class ResourceManager {
  private context: Context;
  engine: EngineService;
  database: DatabaseService;
  account: AccountService;

  constructor(context: {
    httpClient: HttpClientInterface;
    logger: LoggerInterface;
    queryFormatter: QueryFormatter;
    apiEndpoint: string;
  }) {
    this.context = {
      ...context,
      resourceManager: this
    };
    this.engine = new EngineService(this.context);
    this.database = new DatabaseService(this.context);
    this.account = new AccountService(this.context);
  }

  async authenticate(options: { auth: AuthOptions; account?: string }) {
    const { account } = options;
    authDeprecationWarning(options);
    const auth = new Authenticator(this.context, options);
    await auth.authenticate();
    await this.account.resolveAccountId(account);
  }
}
