import { AuthenticationError } from "../../common/errors";
import { Connection } from "../../connection";
import { Context } from "../../types";

export class AccountService {
  private context: Context;

  id!: string;
  name!: string;
  connection!: Connection;

  constructor(context: Context) {
    this.context = context;
  }

  // TODO: find a unified place for this
  private throwErrorIfNoConnection() {
    if (typeof this.connection == "undefined") {
      throw new AuthenticationError({
        message:
          "Can't execute a resource manager operation. Did you run authenticate()?"
      });
    }
  }

  async setAccountName(account: string) {
    this.name = account;
  }

  async resolveAccountId(accountName: string) {
    this.throwErrorIfNoConnection();
    this.id = await this.connection.resolveAccountId(accountName);
    return this.id;
  }
}
