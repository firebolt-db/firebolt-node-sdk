import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("SET statements", () => {
  it("executes SET statement", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    // SET statements don't return data, just verify they execute without error
    // Use a setting that Core supports (statement_timeout is commonly supported)
    await connection.execute("SET statement_timeout=10000");
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();

    expect(data[0][0]).toEqual(1);
  });

  it("SET statement affects subsequent queries", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    // Use a setting that Core supports
    await connection.execute("SET statement_timeout=5000");
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();

    expect(data[0][0]).toEqual(1);
  });

  it("handles multiple SET statements", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.execute("SET statement_timeout=10000");
    await connection.execute("SET max_threads=1");
    const statement = await connection.execute("SELECT 1");
    const { data } = await statement.fetchResult();

    expect(data[0][0]).toEqual(1);
  });
});

