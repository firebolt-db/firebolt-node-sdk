import { Firebolt } from "../../src/index";
import nock from "nock";

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
    const query = `SELECT checksum(*) FROM generate_series(1, 10000000000)`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(query);

    const { data, meta } = await statement.fetchResult();
    expect(data).toBeTruthy();
    expect(meta).toBeTruthy();
  });
  it("fails with timeout on network disconnect", async () => {
    const query = `SELECT checksum(*) FROM generate_series(1, 10000000000)`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    setTimeout(() => {
      nock.disableNetConnect();
    }, 10000);
    try {
      const statement = await connection.execute(query);
      await statement.fetchResult();
      expect(true).toEqual(false);
    } catch (error) {
      expect(true).toEqual(true);
    } finally {
      nock.enableNetConnect();
    }
  });
});
