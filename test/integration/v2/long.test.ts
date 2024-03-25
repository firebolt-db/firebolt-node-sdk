import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT_V1 as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

describe("long running request", () => {
  it("handles long request", async () => {
    const query = `SELECT checksum(*) FROM generate_series(1, 430000000000)`;

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
