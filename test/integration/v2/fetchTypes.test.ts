import { Firebolt } from "../../../src/index";
import BigNumber from "bignumber.js";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT_V1 as string,
  database: process.env.FIREBOLT_DATABASE as string
};

jest.setTimeout(100000);

describe("types", () => {
  it("handles select boolean", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("select true::boolean");

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("boolean");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(true);
  });
  it("handles select bigint", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    // Max value for a signed 64-bit integer (bigint)
    const statement = await connection.execute("select 9223372036854775807");

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("long");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(new BigNumber("9223372036854775807"));
  });
  it("handles select negative bigint", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    // Max negative value for a signed 64-bit integer (bigint)
    const statement = await connection.execute("select -9223372036854775808");

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("long");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(
      new BigNumber("-9223372036854775808")
    );
  });
});
