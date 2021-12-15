import { Firebolt } from "../../src/index";
import { OutputFormat } from "../../src/types";

const connectionParams = {
  username: process.env.FIREBOLT_USERNAME as string,
  password: process.env.FIREBOLT_PASSWORD as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(15000);

describe("integration test", () => {
  it("works", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1");
    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });
  it("json output format", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT 1", {
      settings: { output_format: OutputFormat.JSON },
      response: { normalizeData: false }
    });
    const { data } = await statement.fetchResult();
    const row = data[0];
    expect(row).toMatchObject({ "1": 1 });
  });
  it("returns Date type", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute("SELECT now()");
    const { data } = await statement.fetchResult();
    const row = data[0];
    if (Array.isArray(row)) {
      const value = row[0];
      expect(value).toBeInstanceOf(Date);
    }
  });
  it("fails on no engine found", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    await expect(async () => {
      const connection = await firebolt.connect({
        ...connectionParams,
        engineName: "unknown_engine"
      });
      await connection.execute("SELECT 1");
    }).rejects.toThrow();
  });

  it("fails on wrong engine url", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      username: process.env.FIREBOLT_USERNAME as string,
      password: process.env.FIREBOLT_PASSWORD as string,
      database: process.env.FIREBOLT_DATABASE as string,
      engineEndpoint: "bad engine url"
    });

    await expect(async () => {
      const statement = await connection.execute("SELECT 1");
      await statement.fetchResult();
    }).rejects.toThrow();
  });
  it("destroyed unfinished statements should throw", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    const st1 = connection.execute("SELECT 1");
    const st2 = connection.execute("SELECT 2");
    await connection.destroy();
    expect(st1).rejects.toThrow("The user aborted a request.");
    expect(st2).rejects.toThrow("The user aborted a request.");
  });

  it("stream", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT * from ex_lineitem limit 100",
      { settings: { output_format: OutputFormat.JSON_COMPACT } }
    );

    const {
      data,
      meta: metaPromise,
      statistics: statisticsPromise
    } = await statement.streamResult();

    const rows: unknown[] = [];

    data.on("metadata", metadata => {
      console.log(metadata);
    });

    data.on("error", error => {
      console.log("could be parse error", error);
    });

    const meta = await metaPromise;
    console.log(meta);

    for await (const row of data) {
      rows.push(row);
    }

    const statistics = await statisticsPromise;
    console.log(statistics);

    expect(rows.length).toEqual(100);
  });
  it("compact format", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1", {
      settings: { output_format: OutputFormat.JSON_COMPACT_LIMITED }
    });

    const { data } = await statement.fetchResult();
    const row = data[0];
    expect(row).toMatchObject({ "1": 1 });
  });
  it("failed test connection", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const response = await firebolt.testConnection({
      username: process.env.FIREBOLT_USERNAME as string,
      password: process.env.FIREBOLT_PASSWORD as string,
      database: process.env.FIREBOLT_DATABASE as string,
      engineName: "unknown_engine"
    });

    expect(response.success).toBeFalsy();
  });
  it("test connection", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const response = await firebolt.testConnection(connectionParams);

    expect(response.success).toBeTruthy();
  });
  it("custom parser", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT * from ex_lineitem limit 10"
    );

    // to achieve seamless stream pipes you can use through2
    // or rowparser that returns strings or Buffer
    const { data } = await statement.streamResult({
      rowParser: (row: string) => `${row}\n`
    });

    data.pipe(process.stdout);
  });
});
