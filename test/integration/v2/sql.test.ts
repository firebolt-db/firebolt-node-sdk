import { Firebolt } from "../../../src/index";

const systemEngineConnectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string
};

const connectionParams = {
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string,
  ...systemEngineConnectionParams
};

jest.setTimeout(20000);

describe("sql queries are supported", () => {
  // TODO: Unskip when this is supported on staging
  it.skip("supports use database statement", async () => {
    const new_database_name =
      (process.env.FIREBOLT_DATABASE as string) + "_use_test";
    const table_name = "test_use_database";
    const create_table_sql = `create table if not exists ${table_name} (id text)`;
    const select_table_sql = `SELECT table_name FROM information_schema.tables WHERE table_name = '${table_name}'`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(systemEngineConnectionParams);
    try {
      await connection.execute(`create database ${new_database_name}`);

      await connection.execute(
        `use ${process.env.FIREBOLT_DATABASE as string}`
      );
      await connection.execute(create_table_sql);
      let statement = await connection.execute(select_table_sql);
      let { data } = await statement.fetchResult();
      expect(data.length).toEqual(1);

      await connection.execute(`use ${new_database_name}`);

      statement = await connection.execute(select_table_sql);
      ({ data } = await statement.fetchResult());
      expect(data.length).toEqual(0);
    } finally {
      await connection.execute(`drop database ${new_database_name}`);
    }
  });
});
