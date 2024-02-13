import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

describe("long running request", () => {
  it("handles long request", async () => {
    const query = `SELECT checksum(*) FROM generate_series(1, 250000000000)`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const started = process.hrtime();
    const statement = await connection.execute(query);
    const elapsed_seconds = process.hrtime(started)[0];

    expect(elapsed_seconds).toBeGreaterThan(350);

    const { data, meta } = await statement.fetchResult();
    expect(data).toBeTruthy();
    expect(meta).toBeTruthy();
  }, 10000000 /* 10 minutes timeout */);
});
