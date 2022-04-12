import * as sqlString from "sqlstring";
import { checkArgumentValid } from "../common/util";
import { INVALID_REPLACEMENT, INVALID_REPLACEMENTS } from "../common/errors";

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

  private fillReplacements(query: string, replacements: unknown[]): string {
    return sqlString.format(query, replacements);
  }

  formatQuery(query: string, replacements: unknown[]): string {
    if (replacements) {
      this.checkReplacements(replacements);
      const withReplacements = this.fillReplacements(query, replacements);
      return withReplacements;
    }
    return query;
  }
}
