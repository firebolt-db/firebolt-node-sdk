import { Firebolt } from "../../../src";
import BigNumber from "bignumber.js";
import stream from "node:stream";

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
  it("select nullable bigint", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    // Max value for a signed 64-bit integer (bigint)
    const testQuery = `
      WITH a AS (
        SELECT 9223372036854775807::bigint UNION ALL SELECT null::bigint
      )
      SELECT * FROM a
    `;
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(testQuery);

    const { data, meta } = await statement.fetchResult();
    expect(meta[0].type).toEqual("long null");
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
    await connection.execute("SET enable_create_table_v2=true");
    await connection.execute("SET enable_struct_syntax=true");
    await connection.execute("SET prevent_create_on_information_schema=true");
    await connection.execute("SET enable_create_table_with_struct_type=true");
    await connection.execute("DROP TABLE IF EXISTS test_struct");
    await connection.execute("DROP TABLE IF EXISTS test_struct_helper");
    try {
      await connection.execute(
        "CREATE TABLE IF NOT EXISTS test_struct(id int not null, s struct(a array(int) null, b bytea null) not null)"
      );
      await connection.execute(
        "CREATE TABLE IF NOT EXISTS test_struct_helper(a array(int) not null, b bytea null)"
      );
      const bytea_value = Buffer.from("hello_world_123ツ\n\u0048");
      await connection.execute(
        "INSERT INTO test_struct_helper(a, b) VALUES ([1, 2], ?::bytea)",
        { parameters: [bytea_value] }
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
        "struct(id int, s struct(a array(int null) null, b bytea null))"
      );
      const row = data[0];
      expect((row as unknown[])[0]).toEqual({
        id: 1,
        s: { a: [1, 2], b: bytea_value }
      });

      const row2 = data[1];
      expect((row2 as unknown[])[0]).toEqual({
        id: 1,
        s: { a: [3, null], b: null }
      });
    } finally {
      // Make sure to always clean up
      await connection.execute("DROP TABLE IF EXISTS test_struct");
      await connection.execute("DROP TABLE IF EXISTS test_struct_helper");
    }
  });
  //todo fix nullable types FIR-45354
  it("select all types", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionParams,
      engineName: process.env.FIREBOLT_ENGINE_NAME as string
    });
    const statement = await connection.execute(
      "select  1                                                         as col_int,\n" +
        "        null::int                                                 as col_int_null,\n" +
        "        30000000000                                               as col_long,\n" +
        "        null::bigint                                              as col_long_null,\n" +
        "        1.23::float4                                              as col_float,\n" +
        "        null::float4                                              as col_float_null,\n" +
        "        1.23456789012                                             as col_double,\n" +
        "        null::double                                              as col_double_null,\n" +
        "        'text'                                                    as col_text,\n" +
        "        null::text                                                as col_text_null,\n" +
        "        '2021-03-28'::date                                        as col_date,\n" +
        "        null::date                                                as col_date_null,\n" +
        "        '2019-07-31 01:01:01'::timestamp                          as col_timestamp,\n" +
        "        null::timestamp                                           as col_timestamp_null,\n" +
        "        '1111-01-05 17:04:42.123456'::timestamptz                 as col_timestamptz,\n" +
        "        null::timestamptz                                         as col_timestamptz_null,\n" +
        "        true                                                      as col_boolean,\n" +
        "        null::bool                                                as col_boolean_null,\n" +
        "        [1,2,3,4]                                                 as col_array,\n" +
        "        null::array(int)                                          as col_array_null,\n" +
        "        '1231232.123459999990457054844258706536'::decimal(38, 30) as col_decimal,\n" +
        "        null::decimal(38, 30)                                     as col_decimal_null,\n" +
        "        'abc123'::bytea                                           as col_bytea,\n" +
        "        null::bytea                                               as col_bytea_null,\n" +
        "        'point(1 2)'::geography                                   as col_geography,\n" +
        "        null::geography                                           as col_geography_null,\n" +
        "        [[1,2],[null,2],null]::array(array(int))                  as col_arr_arr,\n" +
        "        null::array(array(int))                                   as col_arr_arr_null"
    );
    const { data, meta } = await statement.fetchResult();
    const metaObjects = [
      { name: "col_int", type: "int" },
      { name: "col_int_null", type: "int null" },
      { name: "col_long", type: "long" },
      { name: "col_long_null", type: "long null" },
      { name: "col_float", type: "float" },
      { name: "col_float_null", type: "float null" },
      { name: "col_double", type: "double" },
      { name: "col_double_null", type: "double null" },
      { name: "col_text", type: "text" },
      { name: "col_text_null", type: "text null" },
      { name: "col_date", type: "date" },
      { name: "col_date_null", type: "date null" },
      { name: "col_timestamp", type: "timestamp" },
      { name: "col_timestamp_null", type: "timestamp null" },
      { name: "col_timestamptz", type: "timestamptz" },
      { name: "col_timestamptz_null", type: "timestamptz null" },
      { name: "col_boolean", type: "boolean" },
      { name: "col_boolean_null", type: "boolean null" },
      { name: "col_array", type: "array(int)" },
      { name: "col_array_null", type: "array(int) null" },
      { name: "col_decimal", type: "decimal(38, 30)" },
      { name: "col_decimal_null", type: "decimal(38, 30) null" },
      { name: "col_bytea", type: "bytea" },
      { name: "col_bytea_null", type: "bytea null" },
      { name: "col_geography", type: "geography" },
      { name: "col_geography_null", type: "geography null" },
      { name: "col_arr_arr", type: "array(array(int null) null)" },
      { name: "col_arr_arr_null", type: "array(array(int)) null" }
    ];
    for (let i = 0; i < meta.length; i++) {
      expect(meta[i]).toEqual(metaObjects[i]);
    }
  });
  //todo fix nullable types FIR-45354
  it("select all types in streaming", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect({
      ...connectionParams,
      engineName: process.env.FIREBOLT_ENGINE_NAME as string
    });
    const statement = await connection.executeStream(
      "select  1                                                         as col_int,\n" +
        "        null::int                                                 as col_int_null,\n" +
        "        30000000000                                               as col_long,\n" +
        "        null::bigint                                              as col_long_null,\n" +
        "        1.23::float4                                              as col_float,\n" +
        "        null::float4                                              as col_float_null,\n" +
        "        1.23456789012                                             as col_double,\n" +
        "        null::double                                              as col_double_null,\n" +
        "        'text'                                                    as col_text,\n" +
        "        null::text                                                as col_text_null,\n" +
        "        '2021-03-28'::date                                        as col_date,\n" +
        "        null::date                                                as col_date_null,\n" +
        "        '2019-07-31 01:01:01'::timestamp                          as col_timestamp,\n" +
        "        null::timestamp                                           as col_timestamp_null,\n" +
        "        '1111-01-05 17:04:42.123456'::timestamptz                 as col_timestamptz,\n" +
        "        null::timestamptz                                         as col_timestamptz_null,\n" +
        "        true                                                      as col_boolean,\n" +
        "        null::bool                                                as col_boolean_null,\n" +
        "        [1,2,3,4]                                                 as col_array,\n" +
        "        null::array(int)                                          as col_array_null,\n" +
        "        '1231232.123459999990457054844258706536'::decimal(38, 30) as col_decimal,\n" +
        "        null::decimal(38, 30)                                     as col_decimal_null,\n" +
        "        'abc123'::bytea                                           as col_bytea,\n" +
        "        null::bytea                                               as col_bytea_null,\n" +
        "        'point(1 2)'::geography                                   as col_geography,\n" +
        "        null::geography                                           as col_geography_null,\n" +
        "        [[1,2],[null,2],null]::array(array(int))                  as col_arr_arr,\n" +
        "        null::array(array(int))                                   as col_arr_arr_null"
    );
    const { data } = await statement.streamResult();
    const [meta] = await stream.once(data, "meta");
    const metaObjects = [
      { name: "col_int", type: "int" },
      { name: "col_int_null", type: "int null" },
      { name: "col_long", type: "long" },
      { name: "col_long_null", type: "long null" },
      { name: "col_float", type: "float" },
      { name: "col_float_null", type: "float null" },
      { name: "col_double", type: "double" },
      { name: "col_double_null", type: "double null" },
      { name: "col_text", type: "text" },
      { name: "col_text_null", type: "text null" },
      { name: "col_date", type: "date" },
      { name: "col_date_null", type: "date null" },
      { name: "col_timestamp", type: "timestamp" },
      { name: "col_timestamp_null", type: "timestamp null" },
      { name: "col_timestamptz", type: "timestamptz" },
      { name: "col_timestamptz_null", type: "timestamptz null" },
      { name: "col_boolean", type: "boolean" },
      { name: "col_boolean_null", type: "boolean null" },
      { name: "col_array", type: "array(int)" },
      { name: "col_array_null", type: "array(int) null" },
      { name: "col_decimal", type: "decimal(38, 30)" },
      { name: "col_decimal_null", type: "decimal(38, 30) null" },
      { name: "col_bytea", type: "bytea" },
      { name: "col_bytea_null", type: "bytea null" },
      { name: "col_geography", type: "geography" },
      { name: "col_geography_null", type: "geography null" },
      { name: "col_arr_arr", type: "array(array(int null) null)" },
      { name: "col_arr_arr_null", type: "array(array(int)) null" }
    ];
    for (let i = 0; i < meta.length; i++) {
      expect(meta[i]).toEqual(metaObjects[i]);
    }
  });
});
