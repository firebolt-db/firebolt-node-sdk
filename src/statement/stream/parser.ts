import JSONbig from "json-bigint";

export class JSONParser {
  state:
    | "meta"
    | "meta-array"
    | "rootKeys"
    | "data"
    | "data-array"
    | "query"
    | "query-object"
    | "statistics-object"
    | null;

  onMetadataParsed;
  hydrateColumn;
  hydrateRow;

  objBuffer?: string;
  currentIndex: number;

  results: {
    rows: unknown[];
    columns: unknown[];
    statistics: any;
    query?: any;
  }[];

  constructor({
    onMetadataParsed = (columns: any) => {},
    hydrateColumn = (column: string) => JSONbig.parse(column),
    hydrateRow = (row: string, isLastRow: boolean): any => JSONbig.parse(row)
  }) {
    this.onMetadataParsed = onMetadataParsed;
    this.hydrateColumn = hydrateColumn;
    this.hydrateRow = hydrateRow;

    this.results = [];

    this.state = null;
    this.currentIndex = 0;
  }

  fillEmptyResult() {
    this.results[this.currentIndex] = {
      columns: [],
      rows: [],
      statistics: {}
    };
  }

  pushColumn(column: unknown) {
    this.results[this.currentIndex].columns.push(column);
  }

  pushRow(row: unknown) {
    this.results[this.currentIndex].rows.push(row);
  }

  pushQuery(query: any) {
    this.results[this.currentIndex].query = query;
  }

  pushStatistics(statistics: any) {
    this.results[this.currentIndex].statistics = statistics;
  }

  handleRoot(line: string) {
    if (line === "{") {
      this.state = "rootKeys";
      if (this.results.length > 0) {
        this.currentIndex += 1;
      }
      this.fillEmptyResult();
    }
  }

  handleRootKeys(line: string) {
    if (line === '"query":') {
      this.state = "query";
    } else if (line === '"query": {') {
      this.objBuffer = "{";
      this.state = "query-object";
    } else if (line === '"meta":') {
      this.state = "meta";
    } else if (line === '"data":') {
      this.state = "data";
    } else if (line === '"meta": [') {
      this.state = "meta-array";
    } else if (line === '"data": [') {
      this.state = "data-array";
    } else if (line === '"statistics":') {
      this.objBuffer = "";
      this.state = "statistics-object";
    } else if (line === "}") {
      this.state = null;
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
      const column = this.hydrateColumn(columnStr);
      this.pushColumn(column);
      this.objBuffer = undefined;
    } else if (line === "{") {
      this.objBuffer = line;
    } else if (line.match(/^],?$/)) {
      this.onMetadataParsed(this.results[this.currentIndex].columns);
      this.state = "rootKeys";
    } else {
      this.objBuffer += line;
    }
  }

  handleDataArray(line: string) {
    if (line.match(/^[\]}],?$/) && this.objBuffer) {
      const rowStr = this.objBuffer + line[0];
      const row = this.hydrateRow(rowStr, false);
      this.pushRow(row);
      this.objBuffer = undefined;
    } else if (line === "{" || line === "[") {
      this.objBuffer = line;
    } else if (line.match(/^],?$/)) {
      this.state = "rootKeys";
    } else if (this.objBuffer === undefined) {
      const isLastRow = line[line.length - 1] !== ",";
      const rowStr = isLastRow ? line : line.substr(0, line.length - 1);
      const row = this.hydrateRow(rowStr, isLastRow);
      this.pushRow(row);
    } else {
      this.objBuffer += line;
    }
  }

  handleData(line: string) {
    if (line === "[") {
      this.state = "data-array";
    }
  }

  handleQuery(line: string) {
    if (line === "{") {
      this.objBuffer = "{";
      this.state = "query-object";
    }
  }

  handleQueryObject(line: string) {
    if (line.match(/^},?$/)) {
      const queryStr = this.objBuffer + "}";
      const query = JSONbig.parse(queryStr);
      this.objBuffer = undefined;
      this.state = "rootKeys";
      this.pushQuery(query);
    } else {
      this.objBuffer += line;
    }
  }

  handleStatisticsObject(line: string) {
    if (line.match(/^},?$/)) {
      const queryStr = this.objBuffer + "}";
      const statistics = JSONbig.parse(queryStr);
      this.objBuffer = undefined;
      this.state = "rootKeys";
      this.pushStatistics(statistics);
    } else {
      this.objBuffer += line;
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
    } else if (this.state === "query") {
      this.handleQuery(line);
    } else if (this.state === "query-object") {
      this.handleQueryObject(line);
    } else if (this.state === "statistics-object") {
      this.handleStatisticsObject(line);
    }
  }

  processBody(body: string) {
    const lines = body.split("\n");
    for (const line of lines) {
      this.processLine(line);
    }
  }
}
