import BigNumber from "bignumber.js";
import { checkArgumentValid, zeroPad } from "../common/util";
import { INVALID_PARAMETERS } from "../common/errors";

const CHARS_GLOBAL_REGEXP = /'/g;

const CHARS_ESCAPE_MAP: Record<string, string> = {
  "'": "''"
};
const SET_PREFIX = "set ";

export class Tuple {
  value: unknown[];

  constructor(value: unknown[]) {
    this.value = value;
  }
}

export class PGDate extends Date {}

export class TimestampTZ extends Date {
  timeZone: string;

  constructor(value: number | string, { timeZone }: { timeZone?: string }) {
    super(value);
    this.timeZone = timeZone || "UTC";
  }
}

export class TimestampNTZ extends Date {}

export class QueryFormatter {
  private format(
    query: string,
    params: unknown[],
    namedParams: Record<string, unknown>
  ) {
    params = [...params];

    // Matches:
    // - ' strings without escapes, 'foo''bar' matches as two strings and it's alright
    // - " strings without escapes, "foo""bar" matches as two strings and it's alright
    // - /* */ comments
    // - -- comments
    // - ? parameters
    // - :: operator
    // - :named parameters
    const tokenizer = /'[^']*'|"[^"]*"|\/\*[\s\S]*?\*\/|--.*|(\?)|::|:(\w+)/g;

    query = query.replace(
      tokenizer,
      (str, param: string | undefined, paramName: string | undefined) => {
        if (param) {
          if (params.length == 0) {
            throw new Error("Too few parameters given");
          }

          return this.escape(params.shift());
        }

        if (paramName) {
          if (!Object.prototype.hasOwnProperty.call(namedParams, paramName)) {
            throw new Error(`Parameter named "${paramName}" not given`);
          }

          return this.escape(namedParams[paramName]);
        }

        return str;
      }
    );

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
    const bytesFormatted = [];
    for (let i = 0; i < param.length; i++) {
      bytesFormatted.push("\\x" + param[i].toString(16).padStart(2, "0"));
    }
    return "E'" + bytesFormatted.join("") + "'";
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

    const year = dt.getUTCFullYear();
    const month = dt.getUTCMonth() + 1;
    const day = dt.getUTCDate();
    const hour = dt.getUTCHours();
    const minute = dt.getUTCMinutes();
    const second = dt.getUTCSeconds();
    const millisecond = dt.getUTCMilliseconds();

    // YYYY-MM-DD HH:mm:ss.mmm
    const yearMonthDay =
      zeroPad(year, 4) + "-" + zeroPad(month, 2) + "-" + zeroPad(day, 2);
    const time =
      zeroPad(hour, 2) +
      ":" +
      zeroPad(minute, 2) +
      ":" +
      zeroPad(second, 2) +
      (millisecond > 0 ? "." + zeroPad(millisecond, 3) : "");

    if (param instanceof PGDate) {
      return this.escapeString(yearMonthDay);
    }

    if (param instanceof TimestampTZ) {
      const str = yearMonthDay + " " + time + " " + param.timeZone;
      return this.escapeString(str);
    }

    const str = yearMonthDay + " " + time;
    return this.escapeString(str);
  }

  private escapeObject(param: unknown) {
    if (param instanceof Tuple) {
      return this.escapeArray(param.value, "(", ")");
    } else if (BigNumber.isBigNumber(param)) {
      return param.toString();
    } else if (param instanceof Date) {
      return this.escapeDate(param);
    } else if (Array.isArray(param)) {
      return this.escapeArray(param);
    } else if (Buffer.isBuffer(param)) {
      return this.escapeBuffer(param);
    } else {
      return this.escapeString("" + param);
    }
  }

  formatQuery(
    query: string,
    parameters?: unknown[],
    namedParameters?: Record<string, unknown>
  ): string {
    if (parameters || namedParameters) {
      if (parameters) {
        checkArgumentValid(Array.isArray(parameters), INVALID_PARAMETERS);
      }

      if (namedParameters) {
        checkArgumentValid(
          typeof namedParameters === "object",
          INVALID_PARAMETERS
        );
      }

      query = this.format(query, parameters ?? [], namedParameters ?? {});
    }
    return query;
  }

  isSetStatement(query: string): boolean {
    return query.trim().toLowerCase().startsWith(SET_PREFIX);
  }

  trimTrailingSemicolon(text: string): string {
    let end = text.length;
    while (end > 0 && text[end - 1] == ";") {
      end--;
    }
    return text.substring(0, end);
  }

  trimStringQuotes(text: string): string {
    if (text.length < 2) {
      return text;
    }

    const firstChar = text[0];
    const lastChar = text[text.length - 1];
    if (firstChar === lastChar && (firstChar === "'" || firstChar === '"')) {
      return text.substring(1, text.length - 1);
    }

    return text;
  }

  splitSetStatement(query: string): [string, string] {
    query = this.trimTrailingSemicolon(query);

    const strippedEquation = query.trim().substring(SET_PREFIX.length).trim();
    const index = strippedEquation.indexOf("=");
    const key = strippedEquation.slice(0, index),
      value = strippedEquation.slice(index + 1);
    if (key.length == 0 || value.length == 0) {
      throw new Error("Invalid SET statement format");
    }
    return [key.trim(), this.trimStringQuotes(value.trim())];
  }
}
