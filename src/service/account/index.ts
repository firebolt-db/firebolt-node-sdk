import { RMContext } from "../../types";

export class AccountService {
  private context: RMContext;

  id!: string;
  name!: string;

  constructor(context: RMContext) {
    this.context = context;
  }

  // TODO: find a unified place for this
  private throwErrorIfNoConnection() {
    if (typeof this.context.connection == "undefined") {
      throw new Error(
        "Can't execute a resource manager operation. Did you run authenticate()?"
      );
    }
  }

  async setAccountName(account: string) {
    this.name = account;
  }

  async resolveAccountId(accountName: string) {
    this.throwErrorIfNoConnection();
    this.id = await this.context.connection!.resolveAccountId(accountName);
    return this.id;
  }
}
