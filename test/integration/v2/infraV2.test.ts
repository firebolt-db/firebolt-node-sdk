import { Firebolt } from "../../../src";

const systemEngineConnectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT_V2 as string
};

const connectionParams = {
  ...systemEngineConnectionParams,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(50000);

describe("infra v2 integration test", () => {
  it("connects", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1");
    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });

  it("supports use engine", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(systemEngineConnectionParams);

    const engine_name = process.env.FIREBOLT_ENGINE_NAME as string;
    await connection.execute(`USE ENGINE ${engine_name}`);

    const statement = await connection.execute("SELECT 1");
    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });

  it("supports use database and use engine", async () => {
    const table_name = "test_use_database";
    const create_table_sql = `create table if not exists ${table_name} (id text)`;
    const insert_sql = `insert into ${table_name} values ('1')`;

    const database_name = process.env.FIREBOLT_DATABASE as string;
    const engine_name = process.env.FIREBOLT_ENGINE_NAME as string;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(systemEngineConnectionParams);
    try {
      // should not create table when database is not specified
      await expect(connection.execute(create_table_sql)).rejects.toThrow();

      await connection.execute(`use database ${database_name}`);
      await connection.execute(create_table_sql);

      await expect(connection.execute(insert_sql)).rejects.toThrow();

      await connection.execute(`use engine ${engine_name}`);

      await connection.execute(insert_sql);
    } finally {
      await connection.execute(`drop table ${table_name}`);
    }
  });
});
