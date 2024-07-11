import { Firebolt } from "../../../src";

const systemEngineConnectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string
};

const connectionParams = {
  ...systemEngineConnectionParams,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

const mixedCaseDBName = process.env.FIREBOLT_DATABASE + "MiXeDcAsE";
const mixedCaseEngineName = process.env.FIREBOLT_ENGINE_NAME + "MiXeDcAsE";

jest.setTimeout(500000);

describe("infra v2 integration test", () => {
  afterAll(async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(systemEngineConnectionParams);
    try {
      await connection.execute(`STOP ENGINE "${mixedCaseEngineName}"`);
    } catch (error) {
      // Ignore the error if the engine does not exist
    }
    await connection.execute(`DROP ENGINE IF EXISTS "${mixedCaseEngineName}"`);
    await connection.execute(`DROP DATABASE IF EXISTS "${mixedCaseDBName}"`);
  });

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
    await connection.execute(`USE ENGINE "${engine_name}"`);

    const statement = await connection.execute("SELECT 1");
    const { data, meta } = await statement.fetchResult();
    expect(data.length).toEqual(1);
    expect(meta.length).toEqual(1);
  });

  it("supports use database and use engine", async () => {
    const table_name = "test_use_database";
    const create_table_sql = `create table if not exists "${table_name}" (id text)`;
    const insert_sql = `insert into "${table_name}" values ('1')`;

    const database_name = process.env.FIREBOLT_DATABASE as string;
    const engine_name = process.env.FIREBOLT_ENGINE_NAME as string;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(systemEngineConnectionParams);
    // should not create table when database is not specified
    await expect(connection.execute(create_table_sql)).rejects.toThrow();

    await connection.execute(`use database "${database_name}"`);
    await connection.execute(create_table_sql);

    await expect(connection.execute(insert_sql)).rejects.toThrow();

    await connection.execute(`use engine "${engine_name}"`);

    await connection.execute(insert_sql);

    await connection.execute(`use engine "system"`);

    await expect(connection.execute(insert_sql)).rejects.toThrow();
  });

  it("can handle mixed case engines and db", async () => {
    const table_name = "test_mixed_case_database";
    const create_table_sql = `create table if not exists "${table_name}" (id text)`;
    const insert_sql = `insert into "${table_name}" values ('1')`;

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(systemEngineConnectionParams);

    await connection.execute(`CREATE DATABASE "${mixedCaseDBName}"`);
    await connection.execute(`CREATE ENGINE "${mixedCaseEngineName}"`);

    const mixedCaseConnectionParams = {
      ...systemEngineConnectionParams,
      database: mixedCaseDBName,
      engineName: mixedCaseEngineName
    };

    const mixedCaseConnection = await firebolt.connect(
      mixedCaseConnectionParams
    );
    await mixedCaseConnection.execute(create_table_sql);
    await mixedCaseConnection.execute(insert_sql);
  });
});
