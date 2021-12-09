import JSONbig from "json-bigint";
import { ExecuteQueryOptions, Context } from "../types";
import { isDataQuery } from "../common/util";
import { RowStream } from "./stream/rowStream";
import { normalizeResponse } from "./normalizeResponse";

export class Statement {
  private context: Context;
  private query: string;
  private executeQueryOptions: ExecuteQueryOptions;
  request: { ready: () => Promise<string>; abort: () => void };

  constructor(
    context: Context,
    {
      query,
      request,
      executeQueryOptions
    }: {
      query: string;
      request: { ready: () => Promise<string>; abort: () => void };
      executeQueryOptions: ExecuteQueryOptions;
    }
  ) {
    this.context = context;

    this.request = request;
    this.query = query;
    this.executeQueryOptions = executeQueryOptions;
  }

  private parseResponse(response: string, query: string) {
    try {
      const parsed = JSONbig.parse(response);
      const { data, meta, statistics } = parsed;
      return {
        data,
        meta,
        statistics
      };
    } catch (error) {
      const isData = isDataQuery(query);
      if (isData || (response.length && !isData)) {
        throw new Error("Failed to parse response");
      }
      return {
        data: null,
        meta: null,
        statistics: null
      };
    }
  }

  async streamRows(): Promise<RowStream> {
    await this.request.ready();
    return new RowStream();
  }

  async fetchRows() {
    const response = await this.request.ready();
    const parsed = this.parseResponse(response, this.query);
    const normalized = normalizeResponse(parsed, this.executeQueryOptions);

    const { data, statistics, meta } = normalized;
    return {
      data,
      statistics,
      meta
    };
  }
}
