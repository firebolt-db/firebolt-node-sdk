import { QueryFormatter } from "./base";

const CHARS_GLOBAL_REGEXP = /[\0\b\t\n\r\x1a"'\\]/g; // eslint-disable-line no-control-regex

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
// Matches:
// - ' strings with \ escapes
// - " strings with \ escapes
// - /* */ comments
// - -- comments
// - ? parameters
// - :: operator
// - :named parameters
// Captures the ? and :named parameters that are not inside strings or quotes
// and special characters
const tokenizer =
  /'(?:[^'\\]+|\\.)*'|"(?:[^"\\]+|\\.)*"|\/\*[\s\S]*\*\/|--.*|(\?)|::|:(\w+)/g;

export class QueryFormatterV1 extends QueryFormatter {
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
