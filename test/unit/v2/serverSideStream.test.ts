import { PassThrough } from "stream";
import { Response } from "node-fetch";
import { ServerSideStream } from "../../../src/statement/stream/serverSideStream";
import { ExecuteQueryOptions } from "../../../src/types";

describe("ServerSideStream", () => {
  let mockResponse: Partial<Response>;
  let executeQueryOptions: ExecuteQueryOptions;

  beforeEach(() => {
    mockResponse = {};
    executeQueryOptions = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("backpressure and pause/resume functionality", () => {
    it("should pause source stream when pending rows exceed maxPendingRows threshold", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      let pauseCalled = false;
      let pauseCallCount = 0;

      // Mock the pause method on the response body (this is what ServerSideStream calls)
      sourceStream.pause = jest.fn(() => {
        pauseCalled = true;
        pauseCallCount++;
        return sourceStream;
      });

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      // Mock push to return false immediately to create backpressure from the start
      // This should cause rows to accumulate in pendingRows
      serverSideStream.push = jest.fn((_chunk: unknown) => {
        // Always return false to simulate constant backpressure
        return false;
      });

      serverSideStream.on("error", done);

      // First send the START message
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      // Send fewer data messages but with multiple rows each
      // Each data message can contain multiple rows in the data array
      let dataMessages = "";
      for (let i = 0; i < 3; i++) {
        dataMessages +=
          JSON.stringify({
            message_type: "DATA",
            data: [[i * 3 + 0], [i * 3 + 1], [i * 3 + 2]]
          }) + "\n";
      }
      sourceStream.write(dataMessages);

      // Give the stream time to process and check if pause was called
      setTimeout(() => {
        expect(pauseCalled).toBe(true);
        expect(pauseCallCount).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it("should resume source stream when pending rows drop below threshold", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      let pauseCalled = false;
      let resumeCalled = false;

      // Set up mocks AFTER ServerSideStream is created to avoid initialization issues
      sourceStream.pause = jest.fn(() => {
        pauseCalled = true;
        return sourceStream;
      });

      sourceStream.resume = jest.fn(() => {
        resumeCalled = true;
        return sourceStream;
      });

      serverSideStream.on("error", done);

      // Mock push to always return false to accumulate rows and trigger pause
      serverSideStream.push = jest.fn(() => {
        return false;
      });

      // Send START message
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      // Send multiple DATA messages to exceed maxPendingRows threshold
      let dataMessages = "";
      for (let i = 0; i < 3; i++) {
        dataMessages +=
          JSON.stringify({
            message_type: "DATA",
            data: [[i * 3 + 0], [i * 3 + 1], [i * 3 + 2]]
          }) + "\n";
      }
      sourceStream.write(dataMessages);

      setTimeout(() => {
        expect(pauseCalled).toBe(true);

        // Now test resume: change push to return true (allow processing)
        serverSideStream.push = jest.fn(() => true);

        // Call _read to trigger the resume condition check
        serverSideStream._read();

        setTimeout(() => {
          expect(resumeCalled).toBe(true);
          done();
        }, 50);
      }, 100);
    });

    it("should properly clean up on stream destruction", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      let resumeCalled = false;

      // Mock resume to track cleanup
      sourceStream.resume = jest.fn(() => {
        resumeCalled = true;
        return sourceStream;
      });

      // Mock destroy method
      sourceStream.destroy = jest.fn();

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      // First pause the stream by creating backpressure
      serverSideStream.push = jest.fn((_chunk: unknown) => {
        return false; // Always return false to simulate backpressure
      });

      // Send start message
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      // Send data to trigger pause
      let dataMessages = "";
      for (let i = 0; i < 3; i++) {
        dataMessages +=
          JSON.stringify({
            message_type: "DATA",
            data: [[i * 3 + 0], [i * 3 + 1], [i * 3 + 2]]
          }) + "\n";
      }
      sourceStream.write(dataMessages);

      setTimeout(() => {
        // Destroy the stream
        serverSideStream.destroy();

        // Check that cleanup happened
        expect(resumeCalled).toBe(true);
        expect(sourceStream.destroy).toHaveBeenCalled();
        done();
      }, 50);
    });

    it("should handle error messages and cleanup properly", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      serverSideStream.on("error", (error: Error) => {
        // Check that error handling resumed the stream for cleanup
        expect(error.message).toContain("Result encountered an error");
        done();
      });

      serverSideStream.on("data", () => {
        // No-op to consume data
      });

      // Send start message
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      let dataMessages = "";
      for (let i = 0; i < 3; i++) {
        dataMessages +=
          JSON.stringify({
            message_type: "DATA",
            data: [[i * 3 + 0]]
          }) + "\n";
      }

      // Send error message
      setTimeout(() => {
        sourceStream.write(dataMessages);
        sourceStream.write(
          JSON.stringify({
            message_type: "FINISH_WITH_ERRORS",
            errors: [{ description: "Test error" }]
          }) + "\n"
        );
      }, 500);
    });
  });

  describe("basic functionality", () => {
    it("should emit meta event on START message", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      let metaReceived = false;

      serverSideStream.on("meta", (meta: unknown) => {
        metaReceived = true;
        expect(meta).toBeDefined();
        expect(Array.isArray(meta)).toBe(true);
      });

      serverSideStream.on("error", done);

      // Add data event handler to consume the stream
      serverSideStream.on("data", () => {
        // No data expected, but this ensures stream consumption
      });

      // Send START message
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      // Send FINISH message to complete
      sourceStream.write(
        JSON.stringify({
          message_type: "FINISH_SUCCESSFULLY"
        }) + "\n"
      );

      sourceStream.end();

      serverSideStream.on("end", () => {
        expect(metaReceived).toBe(true);
        done();
      });
    });

    it("should emit data events for DATA messages", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      const dataEvents: unknown[] = [];

      serverSideStream.on("data", (data: unknown) => {
        dataEvents.push(data);
      });

      serverSideStream.on("error", done);

      // Send START message
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      // Send DATA messages
      sourceStream.write(
        JSON.stringify({
          message_type: "DATA",
          data: [[1], [2], [3]]
        }) + "\n"
      );

      // Send FINISH message
      sourceStream.write(
        JSON.stringify({
          message_type: "FINISH_SUCCESSFULLY"
        }) + "\n"
      );

      sourceStream.end();

      serverSideStream.on("end", () => {
        expect(dataEvents).toHaveLength(3);
        done();
      });
    });

    it("should handle null response body", done => {
      mockResponse.body = undefined;

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      serverSideStream.on("error", (error: Error) => {
        expect(error.message).toBe("Response body is null or undefined");
        done();
      });
    });

    it("should handle malformed JSON gracefully", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      serverSideStream.on("error", (error: Error) => {
        expect(error).toBeDefined();
        done();
      });

      // Send malformed JSON
      sourceStream.write("{ invalid json }\n");
    });

    it("should handle partial lines in buffer correctly", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      let metaReceived = false;
      let dataReceived = false;

      serverSideStream.on("meta", () => {
        metaReceived = true;
      });

      serverSideStream.on("data", () => {
        dataReceived = true;
      });

      serverSideStream.on("end", () => {
        expect(metaReceived).toBe(true);
        expect(dataReceived).toBe(true);
        done();
      });

      serverSideStream.on("error", done);

      // Send data in chunks that split JSON lines
      const startMessage =
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n";

      const dataMessage =
        JSON.stringify({
          message_type: "DATA",
          data: [[1]]
        }) + "\n";

      const finishMessage =
        JSON.stringify({
          message_type: "FINISH_SUCCESSFULLY"
        }) + "\n";

      // Split messages across multiple chunks
      const fullMessage = startMessage + dataMessage + finishMessage;
      const midPoint = Math.floor(fullMessage.length / 2);

      sourceStream.write(fullMessage.slice(0, midPoint));
      setTimeout(() => {
        sourceStream.write(fullMessage.slice(midPoint));
        sourceStream.end();
      }, 10);
    });
  });
});
