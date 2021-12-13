import JSONbig from "json-bigint";
import { Response } from "node-fetch";
import {
  ExecuteQueryOptions,
  StreamOptions,
  Context,
  Meta,
  Statistics
} from "../types";
import { isDataQuery } from "../common/util";
import { RowStream } from "./stream/rowStream";
import { JSONStream } from "./stream/jsonStream";
import { normalizeResponse } from "./normalizeResponse";

export class Statement {
  private context: Context;
  private query: string;
  private executeQueryOptions: ExecuteQueryOptions;

  request: { ready: () => Promise<Response>; abort: () => void };
  rowStream: RowStream;

  constructor(
    context: Context,
    {
      query,
      request,
      executeQueryOptions
    }: {
      query: string;
      request: { ready: () => Promise<Response>; abort: () => void };
      executeQueryOptions: ExecuteQueryOptions;
    }
  ) {
    this.context = context;

    this.request = request;
    this.query = query;
    this.executeQueryOptions = executeQueryOptions;

    this.rowStream = new RowStream();
  }

  private parseResponse(response: string) {
    const parsed = JSONbig.parse(response);
    const { data, meta, statistics } = parsed;
    return {
      data,
      meta,
      statistics
    };
  }

  private handleParseResponse(response: string) {
    try {
      return this.parseResponse(response);
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
  }

  async streamResult(options?: StreamOptions) {
    const response = await this.request.ready();
    const jsonParser = new JSONStream({ emitter: this.rowStream, options });

    let resolveMetadata: (metadata: Meta[]) => void;
    let rejectMetadata: (reason?: any) => void;

    let resolveStatistics: (statistics: Statistics) => void;
    let rejectStatistics: (reason?: any) => void;

    const metadataPromise = new Promise<Meta[]>((resolve, reject) => {
      resolveMetadata = resolve;
      rejectMetadata = reject;
    });

    const statisticsPromise = new Promise<Statistics>((resolve, reject) => {
      resolveStatistics = resolve;
      rejectStatistics = reject;
    });

    let str = Buffer.alloc(0);

    this.rowStream.on("metadata", (metadata: Meta[]) => {
      resolveMetadata(metadata);
    });

    this.rowStream.on("statistics", (statistics: Statistics) => {
      resolveStatistics(statistics);
    });

    const errorHandler = (error: any) => {
      this.rowStream.emit("error", error);
      rejectStatistics(error);
      rejectMetadata(error);
    };

    response.body.on("error", errorHandler);

    response.body.on("data", (chunk: Buffer) => {
      // content type should be application/json?
      // maybe in the future it will change
      const contentType = response.headers.get("content-type");

      if (chunk.lastIndexOf("\n") !== -1 && str) {
        // store in buffer anything after
        const newLinePosition = chunk.lastIndexOf("\n");
        const rest = chunk.slice(newLinePosition + 1);

        try {
          Buffer.concat([str, chunk.slice(0, newLinePosition)])
            .toString("utf8")
            .split("\n")
            .forEach(line => jsonParser.processLine(line));
        } catch (error) {
          errorHandler(error);
          return;
        }

        for (const row of jsonParser.rows) {
          this.rowStream.push(row);
        }

        jsonParser.rows = [];
        str = rest;
      }
    });

    response.body.on("end", () => {
      this.rowStream.push(null);
    });

    return {
      data: this.rowStream,
      meta: metadataPromise,
      statistics: statisticsPromise
    };
  }

  async fetchResult() {
    const response = await this.request.ready();
    const text = await response.text();
    const parsed = this.handleParseResponse(text);
    const normalized = normalizeResponse(parsed, this.executeQueryOptions);

    const { data, statistics, meta } = normalized;
    return {
      data,
      statistics,
      meta
    };
  }
}
