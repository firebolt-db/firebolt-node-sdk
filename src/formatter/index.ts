import { checkArgumentValid } from "../common/util";
import { INVALID_REPLACEMENT, INVALID_REPLACEMENTS } from "../common/errors";

const removeComments = (query: string) => {
  query = query.replace(
    /("(""|[^"])*")|('(''|[^'])*')|(--[^\n\r]*)|(\/\*[\w\W]*?(?=\*\/)\*\/)/gm,
    match => {
      if (
        (match[0] === '"' && match[match.length - 1] === '"') ||
        (match[0] === "'" && match[match.length - 1] === "'")
      )
        return match;

      return "";
    }
  );
  return query;
};

export class QueryFormatter {
  private checkReplacements(replacements: unknown[]) {
    checkArgumentValid(Array.isArray(replacements), INVALID_REPLACEMENTS);

    for (let index = 0, length = replacements.length; index < length; index++) {
      checkArgumentValid(
        JSON.stringify(replacements[index]) !== undefined,
        INVALID_REPLACEMENT
      );
    }
  }

  private format(sql: string, params: unknown[]) {
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

    sql = sql.replace(regex, str => {
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

    return sql;
  }

  escape(param: unknown) {
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

      default: {
        return this.escapeString(param);
      }
    }
    return "" + param;
  }

  escapeString(param: unknown) {
    return "" + param;
  }

  escapeObject(param: unknown) {
    if (Array.isArray(param)) {
      return "array";
    }

    return "object";
  }

  formatQuery(query: string, replacements: unknown[]): string {
    if (replacements) {
      this.checkReplacements(replacements);
      query = removeComments(query);
      query = this.format(query, replacements);
      return query;
    }
    return query;
  }
}
