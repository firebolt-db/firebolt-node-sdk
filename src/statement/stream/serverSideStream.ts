import { Readable } from "stream";
import JSONbig from "json-bigint";
import {
  getNormalizedMeta,
  normalizeResponseRowStreaming
} from "../normalizeResponse";
import { Response } from "node-fetch";
import { ExecuteQueryOptions, Row } from "../../types";
import { Meta } from "../../meta";
import { StreamError } from "../../common/errors";

export class ServerSideStream extends Readable {
  private meta: Meta[] = [];
  private readonly pendingRows: Row[] = [];
  private finished = false;
  private sawTerminal = false; // Seen a terminal protocol message (FINISH_SUCCESSFULLY / FINISH_WITH_ERRORS)
  private processingData = false;
  private readonly bufferGrowthThreshold = 10; // Stop adding to buffer when over this many rows are already in
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
      this.destroy(
        new StreamError([{ description: "Response body is null or undefined" }])
      );
      return;
    }

    this.sourceStream.on("data", (chunk: Buffer) => {
      this.handleData(chunk);
    });

    this.sourceStream.on("end", () => {
      this.handleInputEnd();
    });

    this.sourceStream.on("error", (err: Error) => {
      this.destroy(
        new StreamError([
          {
            description: `Connection error while streaming results: ${err.message}`
          }
        ])
      );
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
      this.pendingRows.length > this.bufferGrowthThreshold &&
      this.sourceStream &&
      !this.sourceStream.isPaused() &&
      !this.processingData
    ) {
      this.sourceStream.pause();
    }
  }

  private handleInputEnd() {
    // Process any remaining line in buffer
    if (this.lineBuffer.trim()) {
      this.processLine(this.lineBuffer.trim());
      this.lineBuffer = "";
    }

    if (this.destroyed) {
      return;
    }

    // The source closed without a terminal message; surface as error since
    // results may be incomplete.
    if (!this.sawTerminal) {
      this.destroy(
        new StreamError([
          {
            description:
              "Stream ended before a terminal message was received; " +
              "results may be incomplete (connection closed unexpectedly)"
          }
        ])
      );
      return;
    }

    this.finished = true;
    this.tryPushPendingData();
  }

  private processLine(line: string) {
    if (!line) return;

    try {
      const parsed = JSONbig.parse(line);
      if (parsed) {
        switch (parsed.message_type) {
          case "DATA":
            this.handleDataMessage(parsed);
            break;
          case "START":
            this.meta = getNormalizedMeta(parsed.result_columns);
            this.emit("meta", this.meta);
            break;
          case "FINISH_SUCCESSFULLY":
            this.sawTerminal = true;
            this.finished = true;
            this.tryPushPendingData();
            break;
          case "FINISH_WITH_ERRORS":
            this.sawTerminal = true;
            // Ensure source stream is resumed before destroying to prevent hanging
            if (this.sourceStream && this.sourceStream.isPaused()) {
              this.sourceStream.resume();
            }
            this.destroy(new StreamError(parsed.errors));
            break;
        }
      } else {
        this.destroy(new StreamError([
          {
            description: `Result row could not be parsed: ${line}`
          }
        ]));
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

      // Try to push pending data immediately
      this.tryPushPendingData();
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

      // If push returns false, stop pushing and wait for _read to be called
      if (!canContinue) {
        break;
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

  // Called when the stream is ready for more data.
  _read() {
    // If there is pending data, push it first
    this.tryPushPendingData();

    // Resume source stream if it was paused and we have capacity
    if (
      this.sourceStream &&
      this.sourceStream.isPaused() &&
      this.pendingRows.length < this.bufferGrowthThreshold
    ) {
      this.sourceStream.resume();
    }
  }

  _destroy(err: Error | null, callback: (error?: Error | null) => void) {
    if (this.sourceStream) {
      // Resume stream if paused to ensure proper cleanup
      if (this.sourceStream.isPaused()) {
        this.sourceStream.resume();
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
