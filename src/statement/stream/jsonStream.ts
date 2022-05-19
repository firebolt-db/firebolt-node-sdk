import JSONbig from "json-bigint";
import { StreamOptions, ExecuteQueryOptions, RowParser } from "../../types";
import { Meta } from "../../meta";
import { normalizeColumn, normalizeRow } from "../normalizeResponse";
import { hydrateRow } from "../hydrateResponse";
import { RowStream } from "./rowStream";

export class JSONStream {
  options?: StreamOptions;
  executeQueryOptions: ExecuteQueryOptions;
  emitter: RowStream;
  rowParser: RowParser;
  state: "meta" | "meta-array" | "rootKeys" | "data" | "data-array" | null;

  columns: Meta[];
  rows: unknown[];
  rest: string;

  objBuffer?: string;

  constructor({
    emitter,
    options,
    executeQueryOptions
  }: {
    emitter: RowStream;
    options?: StreamOptions;
    executeQueryOptions: ExecuteQueryOptions;
  }) {
    this.state = null;
    this.emitter = emitter;
    this.options = options;
    this.executeQueryOptions = executeQueryOptions;

    this.rowParser = this.options?.rowParser || this.defaultRowParser;
    this.columns = [];
    this.rows = [];
    this.rest = "{";
  }

  defaultRowParser(row: string, isLastRow: boolean) {
    const normalizeData = this.executeQueryOptions.response?.normalizeData;
    const parsed = JSONbig.parse(row);
    const hydrate = this.executeQueryOptions.response?.hydrateRow || hydrateRow;
    const hydratedRow = hydrate(parsed, this.columns, this.executeQueryOptions);
    if (normalizeData) {
      const normalizedRow = normalizeRow(
        hydratedRow,
        this.columns,
        this.executeQueryOptions
      );
      return normalizedRow;
    }
    return hydratedRow;
  }

  parseRest() {
    const parsed = JSONbig.parse(this.rest);
    return parsed;
  }

  handleRoot(line: string) {
    if (line === "{") {
      this.state = "rootKeys";
    }
  }

  handleRootKeys(line: string) {
    if (line === '"meta":') {
      this.state = "meta";
    } else if (line === '"data":') {
      this.state = "data";
    } else if (line === '"meta": [') {
      this.state = "meta-array";
    } else if (line === '"data": [') {
      this.state = "data-array";
    } else {
      this.rest += line;
    }
  }

  handleMeta(line: string) {
    if (line === "[") {
      this.state = "meta-array";
    }
  }

  handleMetaArray(line: string) {
    if (line.match(/^},?$/)) {
      const columnStr = this.objBuffer + "}";
      const column = JSONbig.parse(columnStr);
      const normalizedColumn = normalizeColumn(column);
      this.columns.push(normalizedColumn);
      this.objBuffer = undefined;
    } else if (line === "{") {
      this.objBuffer = line;
    } else if (line.match(/^],?$/)) {
      this.emitter.emit("metadata", this.columns);
      this.state = "rootKeys";
    } else {
      this.objBuffer += line;
    }
  }

  handleDataArray(line: string) {
    if (line.match(/^[\]}],?$/) && this.objBuffer) {
      const rowStr = this.objBuffer + line[0];
      const row = this.rowParser(rowStr, false);
      this.rows.push(row);
      this.objBuffer = undefined;
    } else if (line === "{" || line === "[") {
      this.objBuffer = line;
    } else if (line.match(/^],?$/)) {
      this.state = "rootKeys";
    } else if (this.objBuffer === undefined) {
      const isLastRow = line[line.length - 1] !== ",";
      const rowStr = isLastRow ? line : line.substr(0, line.length - 1);
      const row = this.rowParser(rowStr, isLastRow);
      this.rows.push(row);
    } else {
      this.objBuffer += line;
    }
  }

  handleData(line: string) {
    if (line === "[") {
      this.state = "data-array";
    }
  }

  processLine(line: string) {
    line = line.trim();

    if (!line.length) {
      return;
    }

    if (this.state === null) {
      this.handleRoot(line);
    } else if (this.state === "rootKeys") {
      this.handleRootKeys(line);
    } else if (this.state === "meta") {
      this.handleMeta(line);
    } else if (this.state === "data") {
      this.handleData(line);
    } else if (this.state === "meta-array") {
      this.handleMetaArray(line);
    } else if (this.state === "data-array") {
      this.handleDataArray(line);
    }
  }
}
