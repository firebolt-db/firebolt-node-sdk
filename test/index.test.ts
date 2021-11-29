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

    const rows = await connection.execute("SELECT 1");
  });
});
