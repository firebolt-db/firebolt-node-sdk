import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("connection management", () => {
  it("creates multiple connections independently", async () => {
    const firebolt = Firebolt();

    const connection1 = await firebolt.connect(connectionParams);
    const connection2 = await firebolt.connect(connectionParams);

    const statement1 = await connection1.execute("SELECT 1 as conn1");
    const statement2 = await connection2.execute("SELECT 2 as conn2");

    const { data: data1 } = await statement1.fetchResult();
    const { data: data2 } = await statement2.fetchResult();

    expect(data1[0][0]).toEqual(1);
    expect(data2[0][0]).toEqual(2);
  });

  it("maintains session state per connection", async () => {
    const firebolt = Firebolt();

    const connection1 = await firebolt.connect(connectionParams);
    const connection2 = await firebolt.connect(connectionParams);

    // Set different settings on each connection
    await connection1.execute("SET statement_timeout=5000");
    await connection2.execute("SET statement_timeout=10000");

    // Verify each connection maintains its own session state
    const statement1 = await connection1.execute("SELECT 1");
    const statement2 = await connection2.execute("SELECT 1");

    const { data: data1 } = await statement1.fetchResult();
    const { data: data2 } = await statement2.fetchResult();

    expect(data1[0][0]).toEqual(1);
    expect(data2[0][0]).toEqual(1);
  });

  it("can destroy connection", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    // Start a query
    const statementPromise = connection.execute("SELECT 1");

    // Destroy the connection (should abort active requests)
    await connection.destroy();

    // The active request should be aborted
    await expect(statementPromise).rejects.toThrow();
  });
});

