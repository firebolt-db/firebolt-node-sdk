import JSONbig from "json-bigint";
import { Statistics, Meta, ExecuteQueryOptions } from "../types";
import { isDataQuery } from "../common/util";
import { Context } from "../context";
import { RowStream } from "./rowStream";
import { normalizeResponse } from "./normalizeResponse";

export class Statement {
  private context: Context;
  data?: Record<string, unknown>[];
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
    const { logger } = this.context;
    try {
      const parsed = JSONbig.parse(response);
      const { data, meta, statistics } = parsed;
      return {
        data,
        meta,
        statistics
      };
    } catch (e) {
      logger.log("Failed to parse response");
      logger.log(e);
      const isData = isDataQuery(query);
      if (isData || (response.length && !isData)) {
        throw new Error("Query failed - internal execution error");
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
