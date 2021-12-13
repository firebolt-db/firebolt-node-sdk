import JSONbig from "json-bigint";
import { RowStream } from "./rowStream";

export class JSONStream {
  emitter: RowStream;
  state:
    | "meta"
    | "meta-array"
    | "rootKeys"
    | "data"
    | "data-array"
    | "statistics"
    | "statistics-object"
    | null;

  columns: unknown[];
  rows: unknown[];

  objBuffer?: string;

  constructor(emitter: RowStream) {
    this.state = null;
    this.emitter = emitter;

    this.columns = [];
    this.rows = [];
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
    } else if (line === "statistics:") {
      this.state = "statistics";
    }
  }

  handleMeta(line: string) {
    if (line === "[") {
      this.state = "meta-array";
    }
  }

  handleStatistics(line: string) {
    if (line === "{") {
      this.state = "statistics-object";
    }
  }

  handleMetaArray(line: string) {
    if (line.match(/^},?$/)) {
      const columnStr = this.objBuffer + "}";
      const column = JSONbig.parse(columnStr);
      this.columns.push(column);
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
      const row = JSON.parse(rowStr);
      this.rows.push(row);
      this.objBuffer = undefined;
    } else if (line === "{" || line === "[") {
      this.objBuffer = line;
    } else if (line.match(/^],?$/)) {
      this.state = "rootKeys";
    } else if (this.objBuffer === undefined) {
      const rowStr =
        line[line.length - 1] !== "," ? line : line.substr(0, line.length - 1);
      const row = JSON.parse(rowStr);
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
