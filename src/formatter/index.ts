import BigNumber from "bignumber.js";
import { checkArgumentValid } from "../common/util";
import { INVALID_PARAMETERS } from "../common/errors";

const CHARS_GLOBAL_REGEXP = /[\0\b\t\n\r\x1a"'\\]/g; // eslint-disable-line no-control-regex

const COMMENTS_REGEXP =
  /("(""|[^"])*")|('(''|[^'])*')|(--[^\n\r]*)|(\/\*[\w\W]*?(?=\*\/)\*\/)/gm;

const CHARS_ESCAPE_MAP: Record<string, string> = {
  "\0": "\\0",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "\x1a": "\\Z",
  '"': '\\"',
  "'": "\\'",
  "\\": "\\\\"
};

const removeComments = (query: string) => {
  query = query.replace(COMMENTS_REGEXP, match => {
    if (
      (match[0] === '"' && match[match.length - 1] === '"') ||
      (match[0] === "'" && match[match.length - 1] === "'")
    )
      return match;

    return "";
  });
  return query;
};

const zeroPad = (param: number, length: number, direction = "left") => {
  let paded = param.toString();
  while (paded.length < length) {
    if (direction === "left") {
      paded = "0" + paded;
    } else {
      paded = paded + "0";
    }
  }

  return paded;
};

export class Tuple {
  value: unknown[];

  constructor(value: unknown[]) {
    this.value = value;
  }
}

export class PGDate extends Date {}

export class TimestampTZ extends Date {
  timeZone: string;

  constructor(value: number | string, { timeZone }: { timeZone: string }) {
    super(value);
    this.timeZone = timeZone;
  }
}

export class TimestampNTZ extends Date {}

export class QueryFormatter {
  private format(query: string, params: unknown[]) {
    params = [...params];
    const regex = /(''|""|``|\\\\|\\'|\\"|'|"|`|\?)/g;

    const STATE = {
      WHITESPACE: 0,
      SINGLE_QUOTE: 1,
      DOUBLE_QUOTE: 2,
      BACKTICK: 3
    };

    const stateSwitches: Record<string, number> = {
      "'": STATE.SINGLE_QUOTE,
      '"': STATE.DOUBLE_QUOTE,
      "`": STATE.BACKTICK
    };

    let state = STATE.WHITESPACE;

    query = query.replace(regex, str => {
      if (str in stateSwitches) {
        if (state === STATE.WHITESPACE) {
          state = stateSwitches[str];
        } else if (state === stateSwitches[str]) {
          state = STATE.WHITESPACE;
        }
      }

      if (str !== "?") {
        return str;
      }

      if (state !== STATE.WHITESPACE) return str;

      if (params.length == 0) {
        throw new Error("Too few parameters given");
      }

      return this.escape(params.shift());
    });

    if (params.length) {
      throw new Error("Too many parameters given");
    }

    return query;
  }

  private escape(param: unknown) {
    if (param === undefined || param === null) {
      return "NULL";
    }

    switch (typeof param) {
      case "boolean": {
        return param ? "true" : "false";
      }
      case "number": {
        return param.toString();
      }
      case "object": {
        return this.escapeObject(param);
      }

      case "string": {
        return this.escapeString(param);
      }
      default: {
        return "" + param;
      }
    }
  }

  private escapeString(param: string) {
    let chunkIndex = (CHARS_GLOBAL_REGEXP.lastIndex = 0);
    let escapedValue = "";
    let match;

    while ((match = CHARS_GLOBAL_REGEXP.exec(param))) {
      const key = match[0];
      escapedValue +=
        param.slice(chunkIndex, match.index) + CHARS_ESCAPE_MAP[key];
      chunkIndex = CHARS_GLOBAL_REGEXP.lastIndex;
    }

    if (chunkIndex === 0) {
      // Nothing was escaped
      return "'" + param + "'";
    }

    if (chunkIndex < param.length) {
      return "'" + escapedValue + param.slice(chunkIndex) + "'";
    }

    return "'" + escapedValue + "'";
  }

  private escapeBuffer(param: Buffer) {
    return "X" + this.escapeString(param.toString("hex"));
  }

  private escapeArray(param: unknown[], prefix = "[", suffix = "]") {
    let sql = prefix;

    for (let i = 0; i < param.length; i++) {
      const value = param[i];
      const prefix = i === 0 ? "" : ", ";

      if (Array.isArray(value)) {
        sql += prefix + this.escapeArray(value);
      } else {
        sql += prefix + this.escape(value);
      }
    }

    sql += suffix;

    return sql;
  }

  private escapeDate(param: unknown) {
    const dt = new Date(param as Date);

    if (isNaN(dt.getTime())) {
      return "NULL";
    }

    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const hour = dt.getHours();
    const minute = dt.getMinutes();
    const second = dt.getSeconds();
    const millisecond = dt.getMilliseconds();

    // YYYY-MM-DD HH:mm:ss.mmm
    const yearMonthDay =
      zeroPad(year, 4) + "-" + zeroPad(month, 2) + "-" + zeroPad(day, 2);
    const hourMinuteSecond =
      zeroPad(hour, 2) + ":" + zeroPad(minute, 2) + ":" + zeroPad(second, 2);

    if (param instanceof PGDate) {
      return this.escapeString(yearMonthDay);
    }

    if (param instanceof TimestampTZ) {
      const str =
        yearMonthDay +
        " " +
        hourMinuteSecond +
        "." +
        zeroPad(millisecond, 6, "right") +
        " " +
        param.timeZone;
      return this.escapeString(str);
    }

    if (param instanceof TimestampNTZ) {
      const str =
        yearMonthDay +
        " " +
        hourMinuteSecond +
        "." +
        zeroPad(millisecond, 6, "right");
      return this.escapeString(str);
    }
    const str = yearMonthDay + " " + hourMinuteSecond;
    return this.escapeString(str);
  }

  private escapeObject(param: unknown) {
    if (param instanceof Tuple) {
      return this.escapeArray(param.value, "(", ")");
    } else if (BigNumber.isBigNumber(param)) {
      return param.toString();
    } else if (Object.prototype.toString.call(param) === "[object Date]") {
      return this.escapeDate(param);
    } else if (Array.isArray(param)) {
      return this.escapeArray(param);
    } else if (Buffer.isBuffer(param)) {
      return this.escapeBuffer(param);
    } else {
      return this.escapeString("" + param);
    }
  }

  formatQuery(query: string, parameters?: unknown[]): string {
    query = removeComments(query);
    if (parameters) {
      checkArgumentValid(Array.isArray(parameters), INVALID_PARAMETERS);
      query = this.format(query, parameters);
    }
    return query;
  }
}
