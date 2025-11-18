import exp from "node:constants";
import { Firebolt } from "../../../src";
import stream, { TransformCallback } from "node:stream";

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
    let idSum = 0;

    // Process data with simple event handlers (like existing tests)
    data.on("data", row => {
      rowCount++;
      idSum += row[0]; // Sum the id values for data integrity

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
    
    // Verify data integrity with sum check
    const expectedSum = (1000000 * 1000001) / 2; // Sum of 1 to 1,000,000
    expect(idSum).toBe(expectedSum);

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
});
