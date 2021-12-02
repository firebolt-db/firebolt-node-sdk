import { Firebolt } from "../src/index";

describe("integration test", () => {
  it("works", async () => {
    const firebolt = Firebolt({
      logger: {},
      client: {},
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    const connection = await firebolt.connect({
      username: process.env.FIREBOLT_USERNAME as string,
      password: process.env.FIREBOLT_PASSWORD as string,
      database: process.env.FIREBOLT_DATABASE as string,
      //engineUrl: process.env.FIREBOLT_ENGINE_URL as string
      engineName: process.env.FIREBOLT_ENGINE_NAME as string
    });

    const { data, statistics, meta } = await connection.execute("SELECT 1");
    console.log("data", data);
    console.log("meta", meta);
    console.log("stats", statistics);
  });
  it("fails on no engine found", async () => {
    const firebolt = Firebolt({
      logger: {},
      client: {},
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    await expect(async () => {
      const connection = await firebolt.connect({
        username: process.env.FIREBOLT_USERNAME as string,
        password: process.env.FIREBOLT_PASSWORD as string,
        database: process.env.FIREBOLT_DATABASE as string,
        engineName: "unknown_engine"
      });
      await connection.execute("SELECT 1");
    }).rejects.toThrow();
  });

  it("fails on wrong engine url", async () => {
    const firebolt = Firebolt({
      logger: {},
      client: {},
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
      logger: {},
      client: {},
      apiUrl: process.env.FIREBOLT_API_URL as string
    });

    const connection = await firebolt.connect({
      username: process.env.FIREBOLT_USERNAME as string,
      password: process.env.FIREBOLT_PASSWORD as string,
      database: process.env.FIREBOLT_DATABASE as string,
      engineName: process.env.FIREBOLT_ENGINE_NAME as string
    });

    const statement = await connection.execute("SELECT 1");
    const stream = statement.streamRows();
    console.log("stream", stream);
  });
});
