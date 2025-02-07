import JSONbig from "json-bigint";
import {
  ExecuteQueryOptions,
  StreamOptions,
  Context,
  Statistics
} from "../types";
import { Meta } from "../meta";
import { BaseStatement } from "./baseStatement";

export class AsyncStatement extends BaseStatement {
  private asyncToken: string;

  constructor(
    context: Context,
    {
      query,
      text,
      executeQueryOptions
    }: {
      query: string;
      text: string;
      executeQueryOptions: ExecuteQueryOptions;
    }
  ) {
    super(context, { query, text, executeQueryOptions });
    this.asyncToken = this.parseResponse(this.text).token;
  }

  private parseResponse(response: string) {
    const parsed = JSONbig.parse(response);
    const { token, message, monitorSql } = parsed;
    return {
      token,
      message,
      monitorSql
    };
  }
  get async_query_token(): string {
    return this.asyncToken;
  }

  async streamResult(options?: StreamOptions) {
    throw new Error("Method not allowed for async statements");
  }

  async fetchResult(): Promise<{
    data: any;
    meta: Meta[];
    statistics: Statistics | null;
  }> {
    throw new Error("Method not allowed for async statements");
  }
}
