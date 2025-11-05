import { Readable } from "stream";
import JSONbig from "json-bigint";
import readline from "readline";
import {
  getNormalizedMeta,
  normalizeResponseRowStreaming
} from "../normalizeResponse";
import { Response } from "node-fetch";
import { ExecuteQueryOptions, Row } from "../../types";
import { Meta } from "../../meta";

export class ServerSideStream extends Readable {
  private meta: Meta[] = [];
  private readlineInterface: readline.Interface | null = null;
  private pendingRows: Row[] = [];
  private finished = false;
  private processingData = false;
  private readlineInterfacePaused = false;
  private readonly maxPendingRows = 5; // Limit pending rows to prevent memory buildup

  constructor(
    private readonly response: Response,
    private readonly executeQueryOptions: ExecuteQueryOptions
  ) {
    super({ objectMode: true });
    this.setupReadline();
  }

  private setupReadline() {
    this.readlineInterface = readline.createInterface({
      input: this.response.body,
      crlfDelay: Infinity
    });

    const lineParser = (line: string) => {
      try {
        if (line.trim()) {
          const parsed = JSONbig.parse(line);
          if (parsed) {
            if (parsed.message_type === "DATA") {
              this.handleDataMessage(parsed);
            } else if (parsed.message_type === "START") {
              this.meta = getNormalizedMeta(parsed.result_columns);
              this.emit("meta", this.meta);
            } else if (parsed.message_type === "FINISH_SUCCESSFULLY") {
              this.finished = true;
              this.tryPushPendingData();
            } else if (parsed.message_type === "FINISH_WITH_ERRORS") {
              // Ensure readline interface is resumed before destroying to prevent hanging
              if (this.readlineInterface && this.readlineInterfacePaused) {
                this.readlineInterface.resume();
                this.readlineInterfacePaused = false;
              }
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

    this.readlineInterface.on("line", lineParser);

    this.readlineInterface.on("close", () => {
      this.finished = true;
      this.tryPushPendingData();
    });

    this.readlineInterface.on("error", err => {
      this.destroy(err);
    });
  }

  private handleDataMessage(parsed: { data: unknown[] }) {
    if (parsed.data) {
      // Process rows one by one to handle backpressure properly
      const normalizedData = normalizeResponseRowStreaming(
        parsed.data,
        this.executeQueryOptions,
        this.meta
      );

      // Add to pending rows buffer
      this.pendingRows.push(...normalizedData);

      // If we have too many pending rows, pause the readline interface to apply backpressure
      // Only pause if we're not already processing and have significantly exceeded the limit
      if (
        this.pendingRows.length > this.maxPendingRows &&
        this.readlineInterface &&
        !this.readlineInterfacePaused &&
        !this.processingData
      ) {
        this.readlineInterface.pause();
        this.readlineInterfacePaused = true;
      }

      // Try to push data immediately if not already processing
      if (!this.processingData) {
        this.tryPushPendingData();
      }
    }
  }

  private tryPushPendingData() {
    if (this.processingData || this.destroyed) {
      return;
    }

    this.processingData = true;

    while (this.pendingRows.length > 0) {
      const row = this.pendingRows.shift();
      const canContinue = this.push(row);

      // If pending rows dropped below threshold, resume the readline interface
      if (
        this.pendingRows.length <= this.maxPendingRows / 4 &&
        this.readlineInterface &&
        this.readlineInterfacePaused
      ) {
        this.readlineInterface.resume();
        this.readlineInterfacePaused = false;
      }

      // If push returns false, stop pushing and wait for _read to be called
      if (!canContinue) {
        this.processingData = false;
        return;
      }
    }

    // If we've finished processing all data and the server indicated completion
    if (this.finished && this.pendingRows.length === 0) {
      this.push(null);
      this.processingData = false;
      return;
    }

    this.processingData = false;
  }

  _read() {
    // Called when the stream is ready for more data
    if (!this.processingData && this.pendingRows.length > 0) {
      this.tryPushPendingData();
    }

    // Also resume readline interface if it was paused and we have capacity
    if (
      this.readlineInterface &&
      this.readlineInterfacePaused &&
      this.pendingRows.length < this.maxPendingRows / 2
    ) {
      this.readlineInterface.resume();
      this.readlineInterfacePaused = false;
    }
  }

  _destroy(err: Error | null, callback: (error?: Error | null) => void) {
    if (this.readlineInterface) {
      // Resume interface if paused to ensure proper cleanup
      if (this.readlineInterfacePaused) {
        this.readlineInterface.resume();
        this.readlineInterfacePaused = false;
      }
      this.readlineInterface.close();
      this.readlineInterface = null;
    }
    callback(err);
  }
}
