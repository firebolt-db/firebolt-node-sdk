import JSONbig from "json-bigint";
import {
  ExecuteQueryOptions,
  StreamOptions,
  Context,
  Statistics
} from "../types";
import { Meta } from "../meta";
import { isDataQuery } from "../common/util";
import { RowStream } from "./stream/rowStream";
import { normalizeResponse } from "./normalizeResponse";
import { CompositeError } from "../common/errors";

export class Statement {
  private rowStream: RowStream;
  private context: Context;
  private query: string;
  private executeQueryOptions: ExecuteQueryOptions;
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
    this.rowStream = new RowStream();
  }

  private parseResponse(response: string) {
    const parsed = JSONbig.parse(response);
    const { data, meta, statistics, errors = undefined } = parsed;
    return {
      data,
      meta,
      statistics,
      errors
    };
  }

  private handleParseResponse(response: string) {
    let errors, json;
    try {
      ({ errors, ...json } = this.parseResponse(response));
    } catch (error) {
      const isData = isDataQuery(this.query);
      if (isData || (response.length && !isData)) {
        throw new Error("Failed to parse response");
      }
      return {
        data: null,
        meta: null,
        statistics: null
      };
    }
    if (errors !== undefined) throw new CompositeError(errors);
    return json;
  }

  async streamResult(options?: StreamOptions) {
    // Streaming is not supported right now in Firebolt
    // This is a placeholder for future implementation
    const parsed = this.handleParseResponse(this.text);
    const normalized = normalizeResponse(parsed, this.executeQueryOptions);

    const { data, meta, statistics } = normalized;

    for (const row of data) {
      this.rowStream.push(row);
    }
    this.rowStream.push(null);
    this.rowStream.end();

    return {
      data: this.rowStream,
      meta: Promise.resolve(meta),
      statistics: Promise.resolve(statistics)
    };
  }

  async fetchResult(): Promise<{
    data: any;
    meta: Meta[];
    statistics: Statistics | null;
  }> {
    const parsed = this.handleParseResponse(this.text);
    const normalized = normalizeResponse(parsed, this.executeQueryOptions);

    const { data, meta, statistics } = normalized;

    return {
      data,
      meta,
      statistics
    };
  }
}
