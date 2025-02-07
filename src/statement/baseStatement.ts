import {
  ExecuteQueryOptions,
  Context,
  StreamOptions,
  Statistics
} from "../types";
import { Meta } from "../meta";

export abstract class BaseStatement {
  protected context: Context;
  protected query: string;
  protected executeQueryOptions: ExecuteQueryOptions;
  protected text: string;

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
  }

  abstract streamResult(options?: StreamOptions): Promise<any>;
  abstract fetchResult(): Promise<{
    data: any;
    meta: Meta[];
    statistics: Statistics | null;
  }>;
}
