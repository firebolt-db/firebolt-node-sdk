import JSONbig from "json-bigint";
import { Statistics, Meta, Row, ExecuteQueryOptions, Context } from "../types";
import { isDataQuery } from "../common/util";
import { RowStream } from "./stream/rowStream";
import { normalizeResponse } from "./normalizeResponse";

export class Statement {
  private context: Context;
  data: Row[];
  meta: Meta[];
  statistics: Statistics | null;

  constructor(
    context: Context,
    {
      query,
      response,
      executeQueryOptions
    }: {
      query: string;
      response: string;
      executeQueryOptions: ExecuteQueryOptions;
    }
  ) {
    this.context = context;

    const parsed = this.parseResponse(response, query);
    const normalized = normalizeResponse(parsed, executeQueryOptions);

    const { data, statistics, meta } = normalized;

    this.data = data;
    this.statistics = statistics;
    this.meta = meta;
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

  streamRows(): RowStream {
    return new RowStream();
  }
}
