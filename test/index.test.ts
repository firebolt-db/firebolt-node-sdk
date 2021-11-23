import { Firebolt } from "../src/index";

describe("integration test", () => {
  it("works", async () => {
    const firebolt = Firebolt({
      loggerOptions: {},
      clientOptions: {}
    });

    const connection = await firebolt.connect({
      api_url: process.env.FIREBOLT_API_URL as string,
      username: process.env.FIREBOLT_USERNAME as string,
      password: process.env.FIREBOLT_PASSWORD as string,
      database: process.env.FIREBOLT_DATABASE as string,
      engine: process.env.FIREBOLT_ENGINE as string
    });

    const rows = await connection.execute("SELECT 1");

    console.log(rows);
  });
});
