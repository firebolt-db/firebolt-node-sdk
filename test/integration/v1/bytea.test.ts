import { Firebolt } from "../../src/index";

const connectionParams = {
  auth: {
    username: process.env.FIREBOLT_USERNAME as string,
    password: process.env.FIREBOLT_PASSWORD as string
  },
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
    expect(meta[0].type).toEqual("nullable(bytea)");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(null);
  });
});
