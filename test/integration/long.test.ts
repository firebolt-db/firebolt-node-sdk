import { Firebolt } from "../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(500000);

describe("long running request", () => {
  it.skip("handles long request", async () => {
    const query = `SELECT sleepEachRow(1) from numbers(360)`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(query, {
      settings: { use_standard_sql: 0, advanced_mode: 1 }
    });

    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(360);
    expect(meta.length).toEqual(1);
  });
});
