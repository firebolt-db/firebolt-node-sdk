import { ResourceManagerContext } from "../../types";

export class AccountService {
  id!: string;
  name!: string;
  context: ResourceManagerContext;

  constructor(context: ResourceManagerContext) {
    this.context = context;
  }

  async setAccountName(account: string) {
    this.name = account;
  }

  async resolveAccountId(accountName: string) {
    this.id = await this.context.connection.resolveAccountId(accountName);
    return this.id;
  }
}
