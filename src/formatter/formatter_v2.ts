import { QueryFormatter } from "./base";

const CHARS_GLOBAL_REGEXP = /[']/g; // eslint-disable-line no-control-regex

const CHARS_ESCAPE_MAP: Record<string, string> = {
  "'": "''"
};
// Matches:
// - ' strings
// - " strings
// - /* */ comments
// - -- comments
// - ? parameters
// - :: operator
// - :named parameters
const tokenizer = /'[^']*'|"[^"]*"|\/\*[\s\S]*\*\/|--.*|(\?)|::|:(\w+)/g;

export class QueryFormatterV2 extends QueryFormatter {
  constructor() {
    super();
  }
  get CHARS_GLOBAL_REGEXP() {
    return CHARS_GLOBAL_REGEXP;
  }
  get CHARS_ESCAPE_MAP() {
    return CHARS_ESCAPE_MAP;
  }
  get tokenizer() {
    return tokenizer;
  }
}
