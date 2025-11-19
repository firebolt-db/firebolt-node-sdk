import { Firebolt } from "../../../src";
import stream from "node:stream";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import BigNumber from "bignumber.js";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(350000);

describe("advanced stream tests", () => {
  it("stream with different data types and memory management", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    // Generate a query with various data types
    const seriesNum = 100000;
    const generateLargeResultQuery = (rows: number) => `
      SELECT 
        i as id,
        'user_' || i::string as username,
        'email_' || i::string || '@example.com' as email,
        CASE WHEN i % 2 = 0 THEN true ELSE false END as status,
        CAST('100000000000000000' as BIGINT) as big_number,
        '2024-01-01'::date + (i % 365) as created_date,
        RANDOM() * 1000 as score,
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' as description
      FROM generate_series(1, ${rows}) as i
    `;

    const statement = await connection.executeStream(
      generateLargeResultQuery(seriesNum),
      {
        response: {
          normalizeData: true,
          bigNumberAsString: false
        }
      }
    );

    const { data } = await statement.streamResult();

    // Add meta event handler to verify column metadata
    data.on("meta", m => {
      expect(m).toEqual([
        { name: "id", type: "int" },
        { name: "username", type: "text" },
        { name: "email", type: "text" },
        { name: "status", type: "boolean" },
        { name: "big_number", type: "long" },
        { name: "created_date", type: "date" },
        { name: "score", type: "double" },
        { name: "description", type: "text" }
      ]);
    });

    // Buffer pool configuration
    const poolSize = 8192; // 8KB
    const poolBuffer = Buffer.allocUnsafe(poolSize);
    const newlineCode = 0x0a; // '\n' character code

    // Track memory usage
    const initialMemory = process.memoryUsage();
    let maxMemoryUsed = initialMemory.heapUsed;
    let rowCount = 0;
    let idSum = 0; // Track sum of id column for data integrity verification

    // Create a JSON transform stream with minimal allocation
    const jsonTransform = new stream.Transform({
      objectMode: true,
      highWaterMark: 1, // Limit buffering - critical for memory
      transform(
        row: unknown,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void
      ) {
        try {
          rowCount++;

          // Add the id to our sum for data integrity verification
          const typedRow = row as Record<string, unknown>;
          const id = typedRow.id as number;
          idSum += id;

          if (rowCount % 5000 === 0) {
            const currentMemory = process.memoryUsage();
            maxMemoryUsed = Math.max(maxMemoryUsed, currentMemory.heapUsed);
            if (global.gc) {
              console.log(`Invoking GC at row ${rowCount}`);
              global.gc();
            }
          }

          // Verify data types are correct for normalized data on first row
          if (rowCount === 1) {
            const typedRow = row as Record<string, unknown>;

            // Verify actual values for first row
            expect(typedRow.id).toBe(1);
            expect(typedRow.username).toBe("user_1");
            expect(typedRow.email).toBe("email_1@example.com");
            expect(typedRow.status).toBe(false); // i=1, 1%2=1, so false
            expect(typedRow.big_number).toEqual(
              new BigNumber("100000000000000000")
            );
            expect(typedRow.created_date).toEqual(new Date("2024-01-02")); // 2024-01-01 + 1 day
            expect(typedRow.description).toBe(
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            );
          }

          // Verify data types are correct for normalized data on last row
          if (rowCount === seriesNum) {
            const typedRow = row as Record<string, unknown>;

            // Verify actual values for last row
            expect(typedRow.id).toBe(seriesNum);
            expect(typedRow.username).toBe(`user_${seriesNum}`);
            expect(typedRow.email).toBe(`email_${seriesNum}@example.com`);
            expect(typedRow.status).toBe(true); // seriesNum=100000, 100000%2=0, so true
            expect(typedRow.big_number).toEqual(
              new BigNumber("100000000000000000")
            );
            expect(typedRow.created_date).toEqual(new Date("2024-12-21")); // 2024-01-01 + (100000 % 365) = 2024-01-01 + 269 days
            expect(typedRow.description).toBe(
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
            );
          }

          const json = JSON.stringify(row);
          const jsonLen = Buffer.byteLength(json);
          const totalLen = jsonLen + 1;

          let buffer: Buffer;
          if (totalLen <= poolSize) {
            // Use pool for small rows - no allocation
            poolBuffer.write(json, 0, jsonLen);
            poolBuffer[jsonLen] = newlineCode;
            buffer = poolBuffer.subarray(0, totalLen);
          } else {
            // Allocate for large rows
            buffer = Buffer.allocUnsafe(totalLen);
            buffer.write(json, 0, jsonLen);
            buffer[jsonLen] = newlineCode;
          }

          this.push(buffer);
          callback();
        } catch (err) {
          callback(err as Error);
        }
      }
    });

    // Create a batch processing stream that writes to a temporary file
    let processedChunks = 0;
    const batchSize = 100;
    let batchBuffer: string[] = [];

    // Create a temporary file for writing
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(
      tempDir,
      `firebolt-stream-test-${Date.now()}.jsonl`
    );
    const fileWriteStream = fs.createWriteStream(tempFilePath, { flags: "w" });

    const outputStream = new stream.Writable({
      highWaterMark: 1, // Reasonable buffer size
      write(chunk: Buffer, encoding, callback) {
        processedChunks++;
        const chunkStr = chunk.toString();
        batchBuffer.push(chunkStr);

        // Process in batches to create natural backpressure patterns
        if (batchBuffer.length >= batchSize) {
          // Process the batch synchronously (simulate some work)
          const batchData = batchBuffer.join("");
          const lines = batchData.split("\n").filter(line => line.trim());

          // Write valid JSON lines to the file
          for (const line of lines) {
            try {
              JSON.parse(line); // Verify it's valid JSON
              fileWriteStream.write(line + "\n");
            } catch (e) {
              // Skip invalid JSON lines
            }
          }

          // Clear the batch
          batchBuffer = [];
        }

        callback();
      },

      final(callback) {
        // Process any remaining items in the final batch
        if (batchBuffer.length > 0) {
          const batchData = batchBuffer.join("");
          const lines = batchData.split("\n").filter(line => line.trim());

          // Write remaining valid JSON lines to the file
          for (const line of lines) {
            try {
              JSON.parse(line); // Verify it's valid JSON
              fileWriteStream.write(line + "\n");
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
          batchBuffer = [];
        }

        // Close the file stream
        fileWriteStream.end(() => {
          callback();
        });
      }
    });

    // Use pipeline for proper backpressure handling
    await stream.promises.pipeline(data, jsonTransform, outputStream);

    // Verify everything worked correctly
    expect(rowCount).toBe(seriesNum);
    expect(processedChunks).toBeGreaterThan(0);

    // Verify data integrity: sum of 1 to N should be N*(N+1)/2
    const expectedSum = (seriesNum * (seriesNum + 1)) / 2;
    expect(idSum).toBe(expectedSum);

    // Verify the file was created and has content
    expect(fs.existsSync(tempFilePath)).toBe(true);
    const fileStats = fs.statSync(tempFilePath);
    expect(fileStats.size).toBeGreaterThan(0);

    // Read a few lines from the file to verify JSON format
    const fileContent = fs.readFileSync(tempFilePath, "utf-8");
    const lines = fileContent.split("\n").filter(line => line.trim());
    expect(lines.length).toBeGreaterThan(0);

    // Verify first line is valid JSON
    if (lines.length > 0) {
      const firstRow = JSON.parse(lines[0]);
      expect(firstRow).toHaveProperty("id");
      expect(firstRow).toHaveProperty("username");
    }

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    // Memory usage should remain reasonable with proper streaming
    const memoryGrowth =
      (maxMemoryUsed - initialMemory.heapUsed) / (1024 * 1024);

    if (global.gc) {
      expect(memoryGrowth).toBeLessThan(30);
    } else {
      expect(memoryGrowth).toBeLessThan(100);
    }

    console.log(
      `Data types streaming test: processed ${rowCount} rows with various data types, ` +
        `memory growth: ${memoryGrowth.toFixed(
          2
        )} MB, processed chunks: ${processedChunks}, file size: ${(
          fileStats.size /
          1024 /
          1024
        ).toFixed(2)} MB`
    );
  });
});
