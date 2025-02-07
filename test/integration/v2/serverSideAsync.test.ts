import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

const testTableName = "test_insert_async";
const longSelect = "SELECT checksum(*) FROM GENERATE_SERIES(1, 2500000000)"; // approx 3 sec
jest.setTimeout(50000);

describe("server side async integration test", () => {
  afterEach(async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    await connection.execute(`DROP TABLE IF EXISTS ${testTableName}`);
  });

  it("can submit async query", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS ${testTableName} (a long)`
    );

    const statement = await connection.executeAsync(
      `INSERT INTO ${testTableName} VALUES (1)`
    );
    await expect(statement.fetchResult()).rejects.toThrow();
    expect(statement.asyncQueryToken).toBeDefined();
    expect(statement.asyncQueryToken).not.toBe("");
  });

  it("can check long-running query status", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS ${testTableName} (a long)`
    );

    const statement = await connection.executeAsync(
      `INSERT INTO ${testTableName} ${longSelect}`
    );
    const token = statement.asyncQueryToken;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    const isRunning = await connection.isAsyncQueryRunning(token);
    expect(isRunning).toBe(true);
    const isSuccessful = await connection.isAsyncQuerySuccessful(token);
    expect(isSuccessful).not.toBeDefined();
    await new Promise(resolve => setTimeout(resolve, 3000)); // wait for the query to finish
    const isRunningAfter = await connection.isAsyncQueryRunning(token);
    expect(isRunningAfter).toBe(false);
    const isSuccessfulAfter = await connection.isAsyncQuerySuccessful(token);
    expect(isSuccessfulAfter).toBe(true);
    const statement2 = await connection.execute(
      `SELECT * FROM ${testTableName}`
    );
    const { data } = await statement2.fetchResult();
    expect(data.length).toBe(1);
  });

  it("can cancel long-running query", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS ${testTableName} (a long)`
    );

    const statement = await connection.executeAsync(
      `INSERT INTO ${testTableName} ${longSelect}`
    );
    const token = statement.asyncQueryToken;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    await connection.cancelAsyncQuery(token);
    await new Promise(resolve => setTimeout(resolve, 200)); // wait for the cancellation to take effect
    const isRunning = await connection.isAsyncQueryRunning(token);
    expect(isRunning).toBe(false);
    const isSuccessful = await connection.isAsyncQuerySuccessful(token);
    expect(isSuccessful).toBe(false);
  });

  it("test can check execution from another connection", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS ${testTableName} (a long)`
    );

    const statement = await connection.executeAsync(
      `INSERT INTO ${testTableName} ${longSelect}`
    );
    const token = statement.asyncQueryToken;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    const connection2 = await firebolt.connect(connectionParams);
    const isRunning = await connection2.isAsyncQueryRunning(token);
    expect(isRunning).toBe(true);
    const isSuccessful = await connection2.isAsyncQuerySuccessful(token);
    expect(isSuccessful).not.toBeDefined();
    await new Promise(resolve => setTimeout(resolve, 3000)); // wait for the query to finish
    const isRunningAfter = await connection2.isAsyncQueryRunning(token);
    expect(isRunningAfter).toBe(false);
    const isSuccessfulAfter = await connection2.isAsyncQuerySuccessful(token);
    expect(isSuccessfulAfter).toBe(true);
    const statement2 = await connection2.execute(
      `SELECT * FROM ${testTableName}`
    );
    const { data } = await statement2.fetchResult();
    expect(data.length).toBe(1);
  });
});
