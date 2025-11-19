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
    it("should pause source stream when pending rows exceed bufferGrowthThreshold", done => {
      const sourceStream = new PassThrough();
      mockResponse.body = sourceStream;

      let pauseCalled = false;

      // Mock the pause method
      sourceStream.pause = jest.fn(() => {
        pauseCalled = true;
        return sourceStream;
      });

      const serverSideStream = new ServerSideStream(
        mockResponse as never,
        executeQueryOptions
      );

      serverSideStream.on("error", done);

      // Send START message first
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      // Wait for start message to be processed, then setup backpressure
      setTimeout(() => {
        // Mock push to always return false to create backpressure
        const originalPush = serverSideStream.push.bind(serverSideStream);
        serverSideStream.push = jest.fn(chunk => {
          if (chunk !== null) {
            return false; // Always return false for data chunks
          }
          return originalPush(chunk); // Allow null (end) to pass through
        });

        // Send a large single data message with many rows to ensure we exceed threshold
        const largeDataMessage =
          JSON.stringify({
            message_type: "DATA",
            data: Array.from({ length: 15 }, (_, i) => [i]) // 15 rows, exceeds threshold of 10
          }) + "\n";

        sourceStream.write(largeDataMessage);

        // Check after a delay
        setTimeout(() => {
          expect(pauseCalled).toBe(true);
          done();
        }, 50);
      }, 10);
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

      // Send START message first
      sourceStream.write(
        JSON.stringify({
          message_type: "START",
          result_columns: [{ name: "id", type: "integer" }]
        }) + "\n"
      );

      setTimeout(() => {
        // Mock push to always return false to accumulate rows and trigger pause
        const originalPush = serverSideStream.push.bind(serverSideStream);
        serverSideStream.push = jest.fn(chunk => {
          if (chunk !== null) {
            return false; // Always return false for data chunks to accumulate
          }
          return originalPush(chunk);
        });

        // Send large data message to exceed threshold and trigger pause
        const largeDataMessage =
          JSON.stringify({
            message_type: "DATA",
            data: Array.from({ length: 15 }, (_, i) => [i])
          }) + "\n";

        sourceStream.write(largeDataMessage);

        setTimeout(() => {
          expect(pauseCalled).toBe(true);

          // Now test resume: change push to return true (allow processing)
          serverSideStream.push = jest.fn(chunk => {
            if (chunk !== null) {
              return true; // Allow processing to drain buffer
            }
            return originalPush(chunk);
          });

          // Call _read to trigger the resume condition check
          serverSideStream._read();

          setTimeout(() => {
            expect(resumeCalled).toBe(true);
            done();
          }, 50);
        }, 50);
      }, 10);
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
      serverSideStream.push = jest.fn(() => {
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
      // Send messages one at a time to trigger backpressure check between messages
      for (let i = 0; i < 6; i++) {
        const dataMessage =
          JSON.stringify({
            message_type: "DATA",
            data: [[i * 2 + 0], [i * 2 + 1]]
          }) + "\n";
        sourceStream.write(dataMessage);
      }

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

      // Send data one message at a time to trigger pause
      for (let i = 0; i < 12; i++) {
        const dataMessage =
          JSON.stringify({
            message_type: "DATA",
            data: [[i]]
          }) + "\n";
        sourceStream.write(dataMessage);
      }

      // Send error message
      setTimeout(() => {
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
