import { Readable } from "stream";
import JSONbig from "json-bigint";
import readline from "readline";
import {
  getNormalizedMeta,
  normalizeResponseRowStreaming
} from "../normalizeResponse";
import { Response } from "node-fetch";
import { ExecuteQueryOptions } from "../../types";
import { Meta } from "../../meta";

export class ServerSideStream extends Readable {
  private meta: Meta[] = [];
  constructor(
    private readonly response: Response,
    private readonly executeQueryOptions: ExecuteQueryOptions
  ) {
    super({ objectMode: true });
    const readLine = readline.createInterface({
      input: response.body,
      crlfDelay: Infinity
    });

    const lineParser = (line: string) => {
      try {
        if (line.trim()) {
          const parsed = JSONbig.parse(line);
          if (parsed) {
            if (parsed.message_type === "DATA") {
              this.processData(parsed);
            } else if (parsed.message_type === "START") {
              this.meta = getNormalizedMeta(parsed.result_columns);
              this.emit("meta", this.meta);
            } else if (parsed.message_type === "FINISH_SUCCESSFULLY") {
              this.push(null);
            } else if (parsed.message_type === "FINISH_WITH_ERRORS") {
              this.destroy(
                new Error(
                  `Result encountered an error: ${parsed.errors
                    .map((error: { description: string }) => error.description)
                    .join("\n")}`
                )
              );
            }
          } else {
            this.destroy(new Error(`Result row could not be parsed: ${line}`));
          }
        }
      } catch (err) {
        this.destroy(err);
      }
    };
    readLine.on("line", lineParser);

    readLine.on("close", () => {
      this.push(null);
    });
  }

  private processData(parsed: { data: any[] }) {
    if (parsed.data) {
      const normalizedData = normalizeResponseRowStreaming(
        parsed.data,
        this.executeQueryOptions,
        this.meta
      );
      for (const data of normalizedData) {
        this.emit("data", data);
      }
    }
  }

  _read() {
    /* _read method requires implementation, even if data comes from other sources */
  }
}
