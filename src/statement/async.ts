import JSONbig from "json-bigint";
import {
  ExecuteQueryOptions,
  StreamOptions,
  Context,
  Statistics
} from "../types";
import { Meta } from "../meta";

export class AsyncStatement {
  private readonly asyncToken: string;
  private readonly context: Context;
  private readonly query: string;
  private readonly executeQueryOptions: ExecuteQueryOptions;
  private readonly text: string;

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
    this.context = context;
    this.text = text;
    this.query = query;
    this.executeQueryOptions = executeQueryOptions;
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
  get asyncQueryToken(): string {
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
