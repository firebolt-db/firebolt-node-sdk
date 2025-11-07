import exp from "node:constants";
import { Firebolt } from "../../../src";
import stream, { TransformCallback } from "node:stream";
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

jest.setTimeout(250000);

describe("streams", () => {
  it("check sum from stream result", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      `select 1 from generate_series(1, 2500000)` //~1 GB response
    );

    const { data } = await statement.streamResult();
    let sum = 0;
    const meta = await stream.once(data, "meta");
    console.log("Meta:", meta);

    data.on("data", row => {
      sum += row[0];
    });

    await new Promise(resolve => {
      data.on("end", () => {
        expect(sum).toEqual(2500000);
        resolve(null);
      });
    });
  });
  it("check normalized data", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      `select 1 from generate_series(1, 250000)`, //~1 GB response
      {
        response: {
          normalizeData: true
        }
      }
    );

    const { data } = await statement.streamResult();
    let sum = 0;

    data
      .on("meta", meta => {
        console.log("Meta:", meta);
      })
      .on("data", row => {
        sum += row["?column?"];
      });

    await new Promise(resolve => {
      data.on("end", () => {
        expect(sum).toEqual(250000);
        resolve(null);
      });
    });
  });
  it("stream transformers", async () => {
    class SerializeRowStream extends stream.Transform {
      public constructor() {
        super({
          objectMode: true,
          transform(
            row: unknown,
            encoding: BufferEncoding,
            callback: TransformCallback
          ) {
            const transformed = JSON.stringify(row);
            this.push(transformed);
            this.push("\n");
            callback();
          }
        });
      }
    }
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    const serializedStream = new SerializeRowStream();
    const statement = await connection.executeStream(
      "select * from generate_series(1, 10)"
    );

    const { data } = await statement.streamResult();
    data.pipe(serializedStream).pipe(process.stdout);

    await new Promise(resolve => {
      data.on("end", () => {
        resolve(null);
      });
    });
  });
  it("stream syntax error", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    try {
      await connection.executeStream("select *1;");
    } catch (error) {
      expect(error.message).toContain(
        "Line 1, Column 9: syntax error, unexpected integer, expecting end of file"
      );
      expect(error.message).toContain("select *1;");
    }
  });
  it("stream division by 0 error", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.executeStream(
      "select 1/(i-100000) as a from generate_series(1,100000) as i"
    );

    const { data } = await statement.streamResult();
    data.on("meta", meta => {
      expect(meta).toEqual([
        {
          name: "a",
          type: "int"
        }
      ]);
    });

    // Consume data to prevent backpressure from blocking error messages
    data.on("data", () => {
      // Just consume the data, don't need to do anything with it
    });

    const [error] = await stream.once(data, "error");
    expect(error.message).toEqual(
      "Result encountered an error: Line 1, Column 9: Division by zero\n" +
        "select 1/(i-100000) as a from generate_series(1,...\n" +
        "        ^"
    );
  });
  it("stream backpressure and memory management", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    // Test with a moderate size dataset to verify proper streaming behavior
    const statement = await connection.executeStream(
      "select i as id from generate_series(1, 1000000) as i"
    );

    const { data } = await statement.streamResult();

    // Track memory usage and verify proper data streaming
    const initialMemory = process.memoryUsage();
    let maxMemoryUsed = initialMemory.heapUsed;
    let rowCount = 0;

    // Process data with simple event handlers (like existing tests)
    data.on("data", () => {
      rowCount++;

      // Track memory usage periodically
      if (rowCount % 50 === 0) {
        const currentMemory = process.memoryUsage();
        maxMemoryUsed = Math.max(maxMemoryUsed, currentMemory.heapUsed);
      }
    });

    // Wait for stream completion
    await new Promise((resolve, reject) => {
      data.on("end", resolve);
      data.on("error", reject);
    });

    // Verify the data was processed correctly
    expect(rowCount).toBe(1000000);

    // Memory usage should remain reasonable with proper streaming
    const memoryGrowth =
      (maxMemoryUsed - initialMemory.heapUsed) / (1024 * 1024);

    // Memory growth should be minimal for this size dataset
    expect(memoryGrowth).toBeLessThan(20);

    console.log(
      `Streaming test: processed ${rowCount} rows, ` +
        `memory growth: ${memoryGrowth.toFixed(2)} MB`
    );
  });

  it("stream with pipeline and backpressure", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    // Test with transform streams and pipeline for better backpressure handling
    const statement = await connection.executeStream(
      "select i as id, 'test_data_' || i::string as data from generate_series(1, 1000000) as i"
    );

    const { data } = await statement.streamResult();

    let processedCount = 0;

    // Create a simple counting transform
    const countingTransform = new stream.Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        processedCount++;
        // Pass through the data
        this.push(chunk);
        callback();
      }
    });

    // Create a collecting writable
    const rows: unknown[] = [];
    const collectStream = new stream.Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        rows.push(chunk);
        callback();
      }
    });

    // Use pipeline for proper backpressure handling
    await stream.promises.pipeline(data, countingTransform, collectStream);

    // Verify everything worked correctly
    expect(processedCount).toBe(1000000);
    expect(rows.length).toBe(1000000);
    expect(rows[0]).toEqual([1, "test_data_1"]);

    console.log(`Pipeline test: processed ${processedCount} rows successfully`);
  });
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

          if (rowCount % 5000 === 0) {
            const currentMemory = process.memoryUsage();
            maxMemoryUsed = Math.max(maxMemoryUsed, currentMemory.heapUsed);
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

    // Create a moderate backpressure stream
    let processedChunks = 0;
    const outputStream = new stream.Transform({
      highWaterMark: 1,
      transform(chunk, encoding, callback) {
        processedChunks++;

        // Simulate occasional slow processing with minimal delays
        if (processedChunks % 1000 === 0) {
          setTimeout(() => {
            callback();
          }, 1); // 1ms delay
        } else {
          callback();
        }
      }
    });

    // Use pipeline for proper backpressure handling
    await stream.promises.pipeline(data, jsonTransform, outputStream);

    // Verify everything worked correctly
    expect(rowCount).toBe(seriesNum);
    expect(processedChunks).toBeGreaterThan(0);

    // Memory usage should remain reasonable with proper streaming
    const memoryGrowth =
      (maxMemoryUsed - initialMemory.heapUsed) / (1024 * 1024);
    expect(memoryGrowth).toBeLessThan(120); // Allow reasonable memory for complex data types with various field types

    console.log(
      `Data types streaming test: processed ${rowCount} rows with various data types, ` +
        `memory growth: ${memoryGrowth.toFixed(
          2
        )} MB, processed chunks: ${processedChunks}`
    );
  });
});
