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
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    const connection = await firebolt.connect(connectionParams);

    const { data, meta } = await connection.execute("SELECT 1");
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });
  it("json output format", async () => {
    const firebolt = Firebolt({
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    const connection = await firebolt.connect(connectionParams);
    const { data } = await connection.execute("SELECT 1", {
      settings: { output_format: OutputFormat.JSON },
      response: { normalizeData: false }
    });
    const row = data[0];
    expect(row).toMatchObject({ "1": 1 });
  });
  it("returns Date type", async () => {
    const firebolt = Firebolt({
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    const connection = await firebolt.connect(connectionParams);
    const { data } = await connection.execute("SELECT now()");
    const row = data[0];
    if (Array.isArray(row)) {
      const value = row[0];
      expect(value).toBeInstanceOf(Date);
    }
  });
  it("fails on no engine found", async () => {
    const firebolt = Firebolt({
      apiUrl: process.env.FIREBOLT_API_URL as string
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
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    await expect(async () => {
      const connection = await firebolt.connect({
        username: process.env.FIREBOLT_USERNAME as string,
        password: process.env.FIREBOLT_PASSWORD as string,
        database: process.env.FIREBOLT_DATABASE as string,
        engineUrl: "bad engine url"
      });
      await connection.execute("SELECT 1");
    }).rejects.toThrow();
  });

  it("stream", async () => {
    const firebolt = Firebolt({
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1");
    const stream = statement.streamRows();
    console.log("stream", stream);
  });
});
