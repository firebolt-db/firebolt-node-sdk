import JSONbig from "json-bigint";
import { StreamOptions, ExecuteQueryOptions, RowParser } from "../../types";
import { Meta } from "../../meta";
import { normalizeColumn, normalizeRow } from "../normalizeResponse";
import { hydrateRow } from "../hydrateResponse";
import { RowStream } from "./rowStream";
import { JSONParser } from "./parser";

export class JSONStream {
  jsonParser: JSONParser;
  options?: StreamOptions;
  executeQueryOptions: ExecuteQueryOptions;
  emitter: RowStream;
  rowParser: RowParser;

  constructor({
    emitter,
    options,
    executeQueryOptions
  }: {
    emitter: RowStream;
    options?: StreamOptions;
    executeQueryOptions: ExecuteQueryOptions;
  }) {
    this.emitter = emitter;
    this.options = options;
    this.executeQueryOptions = executeQueryOptions;
    this.rowParser = this.options?.rowParser || this.defaultRowParser;

    this.jsonParser = new JSONParser({
      onMetadataParsed: columns => {
        this.emitter.emit("metadata", columns);
      },
      hydrateRow: this.defaultRowParser,
      hydrateColumn: (columnStr: string) => {
        const column = JSONbig.parse(columnStr);
        return normalizeColumn(column);
      }
    });
  }

  defaultRowParser(row: string, isLastRow: boolean) {
    const normalizeData = this.executeQueryOptions.response?.normalizeData;
    const parsed = JSONbig.parse(row);
    const hydrate = this.executeQueryOptions.response?.hydrateRow || hydrateRow;
    const result = this.getResult(0);
    const columns = result.columns;
    const hydratedRow = hydrate(
      parsed,
      columns as Meta[],
      this.executeQueryOptions
    );
    if (normalizeData) {
      const normalizedRow = normalizeRow(
        hydratedRow,
        columns as Meta[],
        this.executeQueryOptions
      );
      return normalizedRow;
    }
    return hydratedRow;
  }

  processLine(line: string) {
    this.jsonParser.processLine(line);
  }

  getResult(index: number) {
    return this.jsonParser.results[index];
  }
}
