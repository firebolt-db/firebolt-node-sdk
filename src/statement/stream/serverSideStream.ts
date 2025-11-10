import { Readable } from "stream";
import JSONbig from "json-bigint";
import {
  getNormalizedMeta,
  normalizeResponseRowStreaming
} from "../normalizeResponse";
import { Response } from "node-fetch";
import { ExecuteQueryOptions, Row } from "../../types";
import { Meta } from "../../meta";

export class ServerSideStream extends Readable {
  private meta: Meta[] = [];
  private readonly pendingRows: Row[] = [];
  private finished = false;
  private processingData = false;
  private inputPaused = false;
  private readonly maxPendingRows = 5; // Limit pending rows to prevent memory buildup
  private lineBuffer = "";
  private sourceStream: NodeJS.ReadableStream | null = null;

  constructor(
    private readonly response: Response,
    private readonly executeQueryOptions: ExecuteQueryOptions
  ) {
    super({ objectMode: true });
    this.setupInputStream();
  }

  private setupInputStream() {
    this.sourceStream = this.response.body;

    if (!this.sourceStream) {
      this.destroy(new Error("Response body is null or undefined"));
      return;
    }

    this.sourceStream.on("data", (chunk: Buffer) => {
      this.handleData(chunk);
    });

    this.sourceStream.on("end", () => {
      this.handleInputEnd();
    });

    this.sourceStream.on("error", (err: Error) => {
      this.destroy(err);
    });
  }

  private handleData(chunk: Buffer) {
    // Convert chunk to string and add to line buffer
    this.lineBuffer += chunk.toString();

    // Process complete lines
    let lineStart = 0;
    let lineEnd = this.lineBuffer.indexOf("\n", lineStart);

    while (lineEnd !== -1) {
      const line = this.lineBuffer.slice(lineStart, lineEnd);
      this.processLine(line.trim());

      lineStart = lineEnd + 1;
      lineEnd = this.lineBuffer.indexOf("\n", lineStart);
    }

    // Keep remaining partial line in buffer
    this.lineBuffer = this.lineBuffer.slice(lineStart);

    // Apply backpressure if we have too many pending rows
    if (
      this.pendingRows.length > this.maxPendingRows &&
      this.sourceStream &&
      !this.inputPaused &&
      !this.processingData
    ) {
      this.sourceStream.pause();
      this.inputPaused = true;
    }
  }

  private handleInputEnd() {
    // Process any remaining line in buffer
    if (this.lineBuffer.trim()) {
      this.processLine(this.lineBuffer.trim());
      this.lineBuffer = "";
    }

    this.finished = true;
    this.tryPushPendingData();
  }

  private processLine(line: string) {
    if (!line) return;

    try {
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
          // Ensure source stream is resumed before destroying to prevent hanging
          if (this.sourceStream && this.inputPaused) {
            this.sourceStream.resume();
            this.inputPaused = false;
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
    } catch (err) {
      this.destroy(err);
    }
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

      // If pending rows dropped below threshold, resume the source stream
      if (
        this.pendingRows.length <= this.maxPendingRows / 4 &&
        this.sourceStream &&
        this.inputPaused
      ) {
        this.sourceStream.resume();
        this.inputPaused = false;
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

    // Also resume source stream if it was paused and we have capacity
    if (
      this.sourceStream &&
      this.inputPaused &&
      this.pendingRows.length < this.maxPendingRows / 2
    ) {
      this.sourceStream.resume();
      this.inputPaused = false;
    }
  }

  _destroy(err: Error | null, callback: (error?: Error | null) => void) {
    if (this.sourceStream) {
      // Resume stream if paused to ensure proper cleanup
      if (this.inputPaused) {
        this.sourceStream.resume();
        this.inputPaused = false;
      }

      // Only call destroy if it exists (for Node.js streams)
      const destroyableStream = this.sourceStream as unknown as {
        destroy?: () => void;
      };
      if (typeof destroyableStream.destroy === "function") {
        destroyableStream.destroy();
      }
      this.sourceStream = null;
    }
    callback(err);
  }
}
