import { Context } from "../../types";
import { ACCOUNT, ACCOUNT_BY_NAME } from "../../common/api";

export class AccountService {
  private context: Context;

  id!: string;
  name!: string;

  constructor(context: Context) {
    this.context = context;
  }

  async setAccountName(account: string) {
    this.name = account;
  }

  async resolveAccountId(account?: string) {
    const { httpClient, apiEndpoint } = this.context;
    if (account) {
      const queryParams = new URLSearchParams({ account_name: account });
      const url = `${apiEndpoint}/${ACCOUNT_BY_NAME}?${queryParams}`;
      const { account_id } = await httpClient
        .request<{ account_id: string }>("GET", url)
        .ready();
      this.id = account_id;
      return account_id;
    } else {
      const url = `${apiEndpoint}/${ACCOUNT}`;
      const {
        account: { id }
      } = await httpClient
        .request<{ account: { id: string } }>("GET", url)
        .ready();
      this.id = id;
      return id;
    }
  }
}
