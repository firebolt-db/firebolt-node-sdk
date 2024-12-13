import { Firebolt } from "../../../src/index";
import BigNumber from "bignumber.js";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string
};

jest.setTimeout(100000);

describe("test type casting on fetch", () => {
  it("select boolean", async () => {
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
  it("select bigint", async () => {
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
  it("select negative bigint", async () => {
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
  it("select geography", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "select 'POINT(1 2)'::geography"
    );

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("geography");
    const row = data[0];
    expect((row as unknown[])[0]).toEqual(
      "0101000020E6100000FEFFFFFFFFFFEF3F0000000000000040"
    );
  });
  it("select struct", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionParams,
      engineName: process.env.FIREBOLT_ENGINE_NAME as string
    });
    await connection.execute("SET advanced_mode=1");
    await connection.execute("SET enable_struct=1");
    await connection.execute("SET enable_create_table_v2=true");
    await connection.execute("SET enable_row_selection=true");
    await connection.execute("SET prevent_create_on_information_schema=true");
    await connection.execute("SET enable_create_table_with_struct_type=true");
    await connection.execute("DROP TABLE IF EXISTS test_struct");
    await connection.execute("DROP TABLE IF EXISTS test_struct_helper");
    try {
      await connection.execute(
        "CREATE TABLE IF NOT EXISTS test_struct(id int not null, s struct(a array(int) not null, b datetime null) not null)"
      );
      await connection.execute(
        "CREATE TABLE IF NOT EXISTS test_struct_helper(a array(int) not null, b datetime null)"
      );
      await connection.execute(
        "INSERT INTO test_struct_helper(a, b) VALUES ([1, 2], '2019-07-31 01:01:01')"
      );
      // Test null values too
      await connection.execute(
        "INSERT INTO test_struct_helper(a, b) VALUES ([3, null], null)"
      );
      await connection.execute(
        "INSERT INTO test_struct(id, s) SELECT 1, test_struct_helper FROM test_struct_helper"
      );

      const statement = await connection.execute(
        "SELECT test_struct FROM test_struct"
      );

      const { data, meta } = await statement.fetchResult();
      expect(meta[0].type).toEqual(
        "struct(id int, s struct(a array(int null), b timestamp null))"
      );
      const row = data[0];
      expect((row as unknown[])[0]).toEqual({
        id: 1,
        s: { a: [3, null], b: null }
      });

      const row2 = data[1];
      expect((row2 as unknown[])[0]).toEqual({
        id: 1,
        s: { a: [1, 2], b: "2019-07-31 01:01:01" }
      });
    } finally {
      // Make sure to always clean up
      await connection.execute("DROP TABLE IF EXISTS test_struct");
      await connection.execute("DROP TABLE IF EXISTS test_struct_helper");
    }
  });
});
