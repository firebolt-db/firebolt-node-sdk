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

jest.setTimeout(100000);

describe("bytea", () => {
  it("handles select bytea", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT 'hello_world_123ツ\n\u0048'::bytea"
    );

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("bytea");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(
      Buffer.from("hello_world_123ツ\n\u0048")
    );
  });

  it("handles select null bytea", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT null::bytea");

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("bytea null");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(null);
  });

  it("handles bytea insert and then select", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    await connection.execute(
      'CREATE TABLE "bytea_test" (id int, data bytea not null)'
    );
    const bytea_value = Buffer.from("hello_world_123ツ\n\u0048");

    await connection.execute('INSERT INTO "bytea_test" VALUES (1, ?::bytea)', {
      parameters: [bytea_value]
    });

    const statement = await connection.execute('SELECT data FROM "bytea_test"');

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("bytea");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(bytea_value);
    await connection.execute('DROP TABLE IF EXISTS "bytea_test"');
  });
});
