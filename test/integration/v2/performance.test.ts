import { Firebolt } from "../../../src/index";
import * as stream from "stream";

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

describe("performance comparison", () => {
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

  it("compare normal vs streaming execution performance", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);
    const seriesNum = 100000;
    const query = generateLargeResultQuery(seriesNum);

    console.log(`\nTesting performance with ${seriesNum} rows...`);

    // Test normal execution (fetchResult)
    const normalStartTime = process.hrtime.bigint();

    const statement = await connection.execute(query, {
      response: {
        normalizeData: true,
        bigNumberAsString: false
      }
    });

    const { data: normalData } = await statement.fetchResult();
    const normalEndTime = process.hrtime.bigint();

    const normalExecutionTime = Number(normalEndTime - normalStartTime) / 1e6; // Convert to milliseconds

    console.log(`Normal execution: ${normalExecutionTime.toFixed(2)}ms`);
    expect(normalData.length).toBe(seriesNum);

    // Test streaming execution (streamResult)
    const streamStartTime = process.hrtime.bigint();

    const streamStatement = await connection.executeStream(query, {
      response: {
        normalizeData: true,
        bigNumberAsString: false
      }
    });

    const { data: streamData } = await streamStatement.streamResult();

    let streamRowCount = 0;

    // Process streaming data
    const processStreamData = new Promise<void>((resolve, reject) => {
      streamData.on("data", () => {
        streamRowCount++;
      });

      streamData.on("end", () => {
        resolve();
      });

      streamData.on("error", error => {
        reject(error);
      });
    });

    await processStreamData;
    const streamEndTime = process.hrtime.bigint();

    const streamExecutionTime = Number(streamEndTime - streamStartTime) / 1e6; // Convert to milliseconds

    console.log(`Stream execution: ${streamExecutionTime.toFixed(2)}ms`);
    expect(streamRowCount).toBe(seriesNum);

    // Performance analysis
    const timeDifference = normalExecutionTime - streamExecutionTime;

    console.log(`\nPerformance Analysis:`);
    console.log(
      `Time difference: ${timeDifference.toFixed(2)}ms (${
        timeDifference > 0 ? "streaming faster" : "normal faster"
      })`
    );
    console.log(
      `Speed ratio: ${(normalExecutionTime / streamExecutionTime).toFixed(2)}x`
    );

    // Verify both methods processed the same number of rows
    expect(streamRowCount).toBe(normalData.length); // Same number of rows processed

    // Ensure streaming is not more than 10% slower than normal execution
    const maxAllowedStreamTime = normalExecutionTime * 1.1; // 10% slower threshold
    expect(streamExecutionTime).toBeLessThanOrEqual(maxAllowedStreamTime);
  });

  it("compare streaming vs normal with pipeline processing", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);
    const seriesNum = 50000; // Smaller dataset for pipeline comparison
    const query = generateLargeResultQuery(seriesNum);

    console.log(`\nTesting pipeline performance with ${seriesNum} rows...`);

    // Test normal execution with manual processing
    const normalStartTime = process.hrtime.bigint();

    const statement = await connection.execute(query, {
      response: {
        normalizeData: true,
        bigNumberAsString: false
      }
    });

    const { data: normalData } = await statement.fetchResult();

    // Simulate processing (similar to what streaming pipeline would do)
    let processedNormalCount = 0;
    const processedNormalData: string[] = [];
    for (const row of normalData) {
      processedNormalCount++;
      processedNormalData.push(JSON.stringify(row));
    }

    const normalEndTime = process.hrtime.bigint();

    const normalExecutionTime = Number(normalEndTime - normalStartTime) / 1e6;

    console.log(`Normal with processing: ${normalExecutionTime.toFixed(2)}ms`);

    // Test streaming with pipeline processing
    const streamStartTime = process.hrtime.bigint();

    const streamStatement = await connection.executeStream(query, {
      response: {
        normalizeData: true,
        bigNumberAsString: false
      }
    });

    const { data: streamData } = await streamStatement.streamResult();

    let processedStreamCount = 0;

    // Create processing pipeline
    const jsonTransform = new stream.Transform({
      objectMode: true,
      transform(
        row: unknown,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void
      ) {
        try {
          processedStreamCount++;

          const json = JSON.stringify(row);
          this.push(json);
          callback();
        } catch (err) {
          callback(err as Error);
        }
      }
    });

    const processedStreamData: string[] = [];
    const collectStream = new stream.Writable({
      objectMode: true,
      write(chunk: string, encoding, callback) {
        processedStreamData.push(chunk);
        callback();
      }
    });

    // Use pipeline for proper backpressure handling
    await stream.promises.pipeline(streamData, jsonTransform, collectStream);

    const streamEndTime = process.hrtime.bigint();

    const streamExecutionTime = Number(streamEndTime - streamStartTime) / 1e6;

    console.log(`Stream with pipeline: ${streamExecutionTime.toFixed(2)}ms`);

    // Verify results
    expect(processedStreamCount).toBe(seriesNum);
    expect(processedNormalCount).toBe(seriesNum);
    expect(processedStreamData.length).toBe(processedNormalData.length);

    // Performance analysis
    const timeDifference = normalExecutionTime - streamExecutionTime;

    console.log(`\nPipeline Performance Analysis:`);
    console.log(
      `Time difference: ${timeDifference.toFixed(2)}ms (${
        timeDifference > 0 ? "streaming faster" : "normal faster"
      })`
    );
    console.log(
      `Speed ratio: ${(normalExecutionTime / streamExecutionTime).toFixed(2)}x`
    );
    console.log(
      `Processing efficiency: ${(
        processedStreamCount / processedNormalCount
      ).toFixed(2)}x`
    );

    // Verify results
    expect(processedStreamCount).toBe(seriesNum);
    expect(processedNormalCount).toBe(seriesNum);
    expect(processedStreamData.length).toBe(processedNormalData.length);

    // Ensure streaming pipeline is not more than 10% slower than normal execution
    const maxAllowedStreamTime = normalExecutionTime * 1.1; // 10% slower threshold
    expect(streamExecutionTime).toBeLessThanOrEqual(maxAllowedStreamTime);
  });

  it("execution time comparison with different dataset sizes", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);
    const testSizes = [10000, 25000, 50000]; // Different dataset sizes

    const results: Array<{
      size: number;
      normalTime: number;
      streamTime: number;
    }> = [];

    for (const size of testSizes) {
      console.log(`\nTesting dataset size: ${size} rows`);
      const query = generateLargeResultQuery(size);

      // Test normal execution
      const normalStartTime = process.hrtime.bigint();

      const statement = await connection.execute(query, {
        response: { normalizeData: true, bigNumberAsString: false }
      });

      const { data: normalData } = await statement.fetchResult();
      const normalEndTime = process.hrtime.bigint();

      const normalTime = Number(normalEndTime - normalStartTime) / 1e6;

      // Test streaming execution
      const streamStartTime = process.hrtime.bigint();

      const streamStatement = await connection.executeStream(query, {
        response: { normalizeData: true, bigNumberAsString: false }
      });

      const { data: streamData } = await streamStatement.streamResult();

      let streamRowCount = 0;

      await new Promise<void>((resolve, reject) => {
        streamData.on("data", () => {
          streamRowCount++;
        });

        streamData.on("end", resolve);
        streamData.on("error", reject);
      });

      const streamEndTime = process.hrtime.bigint();
      const streamTime = Number(streamEndTime - streamStartTime) / 1e6;

      results.push({
        size,
        normalTime,
        streamTime
      });

      console.log(
        `Size ${size}: Normal(${normalTime.toFixed(
          2
        )}ms) vs Stream(${streamTime.toFixed(2)}ms)`
      );

      expect(normalData.length).toBe(size);
      expect(streamRowCount).toBe(size);
    }

    // Analysis across different sizes
    console.log(`\nExecution Time Scaling Analysis:`);
    for (const result of results) {
      const timeRatio = result.streamTime / result.normalTime;
      const timeDifference = result.normalTime - result.streamTime;

      console.log(
        `Size ${result.size}: Time difference ${timeDifference.toFixed(
          2
        )}ms, Speed ratio ${timeRatio.toFixed(2)}x`
      );

      // Both methods should complete successfully
      expect(result.normalTime).toBeGreaterThan(0);
      expect(result.streamTime).toBeGreaterThan(0);

      // Ensure streaming is not more than 10% slower than normal execution for each dataset size
      const maxAllowedStreamTime = result.normalTime * 1.1; // 10% slower threshold
      expect(result.streamTime).toBeLessThanOrEqual(maxAllowedStreamTime);
    }
  });
});
