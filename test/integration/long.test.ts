import { Firebolt } from "../../src/index";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(500000);

describe("long running request", () => {
  it("handles long request", async () => {
    const query = `SELECT checksum(*) FROM generate_series(1, 50000000000)`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(query);

    const { data, meta } = await statement.fetchResult();
    expect(data).toBeTruthy();
    expect(meta).toBeTruthy();
  });
  it.skip("fails with timeout on network disconnect", async () => {
    const query = `SELECT checksum(*) FROM generate_series(1, 50000000000)`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    try {
      const statement = await connection.execute(query);
      const { data, meta } = await statement.fetchResult();
      console.log(data);
    } catch (error) {
      console.log(error);
      expect(true).toEqual(true);
    }
  });
});
