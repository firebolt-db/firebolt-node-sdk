import BigNumber from "bignumber.js";
import { ConnectionOptions, Firebolt } from "../../../src";
import { PreparedStatementParamStyle } from "../../../src/types";

const connectionParams: ConnectionOptions = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT,
  database: process.env.FIREBOLT_DATABASE,
  engineName: process.env.FIREBOLT_ENGINE_NAME,
  preparedStatementParamStyle: "fb_numeric"
};

jest.setTimeout(250000);

describe("prepared statement", () => {
  it("named parameters: check simple query", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(`select $1, $2`, {
      namedParameters: {
        $1: 1,
        $2: 2
      }
    });

    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual([new BigNumber(1), new BigNumber(2)]);
    expect(meta).toEqual([
      {
        name: "?column?",
        type: "long"
      },
      {
        name: "?column?",
        type: "long"
      }
    ]);
  });
  it("named parameters: check simple query with normalized data", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(`select $1 a, $2 b`, {
      namedParameters: {
        $1: 1,
        $2: 2
      },
      response: { normalizeData: true }
    });

    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual({ a: new BigNumber(1), b: new BigNumber(2) });
    expect(meta).toEqual([
      {
        name: "a",
        type: "long"
      },
      {
        name: "b",
        type: "long"
      }
    ]);
  });
  it("named parameters: should handle various data types", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const now = new Date();

    const statement = await connection.execute(
      "SELECT $1::int, $2::long, $3::decimal(38,4), $4::real, $5::double, $6::array(int), $7::datetime, $8::text",
      {
        namedParameters: {
          $1: 42, // int
          $2: "9007199254740991", // long
          $3: "12345.6789", // decimal as string
          $4: 3.14, // float
          $5: 2.718281828459045, // double
          $6: [1, 2, 3], // array
          $7: now, // datetime
          $8: "Hello Firebolt!" // string
        }
      }
    );

    const { data, meta } = await statement.fetchResult();

    // Check returned data (converted types as expected)
    expect(data[0][0]).toEqual(42); // int
    expect(data[0][1]).toEqual(new BigNumber("9007199254740991")); // long
    expect(data[0][2]).toEqual("12345.6789"); // decimal
    expect(data[0][3]).toEqual(3.14); // float
    expect(data[0][4]).toEqual(new BigNumber("2.718281828459045")); // double
    expect(data[0][5]).toEqual([1, 2, 3]); // array of numbers
    expect(new Date(data[0][6])).toEqual(now); // datetime
    expect(data[0][7]).toEqual("Hello Firebolt!"); // string

    // Check metadata for types
    expect(meta.map((m: any) => m.type)).toEqual([
      "int", // $1
      "long", // $2
      "decimal", // $3
      "float", // $4
      "double", // $5
      "array(int null)", // $6
      "timestamp", // $7
      "text" // $8
    ]);
  });
  it("named parameters: should execute with more parameters provided", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT $1, $2", {
      namedParameters: { $1: 1, $2: 2, $3: 3 }
    });
    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual([new BigNumber(1), new BigNumber(2)]);
    expect(meta).toEqual([
      {
        name: "?column?",
        type: "long"
      },
      {
        name: "?column?",
        type: "long"
      }
    ]);
  });
  it("named parameters: should execute with random parameters index", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT $34, $72", {
      namedParameters: { $34: 1, $72: 2 }
    });
    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual([new BigNumber(1), new BigNumber(2)]);
    expect(meta).toEqual([
      {
        name: "?column?",
        type: "long"
      },
      {
        name: "?column?",
        type: "long"
      }
    ]);
  });
  it("named parameters: should throw error when not enough parameters provided", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.execute("SELECT $1, $2", {
        namedParameters: { $1: 1 }
      })
    ).rejects.toThrow(
      /Line 1, Column 12: Query referenced positional parameter \$2, but it was not set/
    );
  });
  it("named parameters: should throw error when incorrect parameters provided", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.execute("SELECT $1, $2", {
        namedParameters: { $1: 1, $3: 2 }
      })
    ).rejects.toThrow(
      /Line 1, Column 12: Query referenced positional parameter \$2, but it was not set/
    );
  });
  it("normal parameters: check simple query", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(`select $1, $2`, {
      parameters: [1, 2]
    });

    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual([new BigNumber(1), new BigNumber(2)]);
    expect(meta).toEqual([
      {
        name: "?column?",
        type: "long"
      },
      {
        name: "?column?",
        type: "long"
      }
    ]);
  });
  it("normal parameters: check simple query with normalized data", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(`select $1 a, $2 b`, {
      parameters: [1, 2],
      response: { normalizeData: true }
    });

    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual({ a: new BigNumber(1), b: new BigNumber(2) });
    expect(meta).toEqual([
      {
        name: "a",
        type: "long"
      },
      {
        name: "b",
        type: "long"
      }
    ]);
  });
  it("normal parameters: should handle various data types", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const now = new Date();

    const statement = await connection.execute(
      "SELECT $1::int, $2::long, $3::decimal(38,4), $4::real, $5::double, $6::array(int), $7::datetime, $8::text",
      {
        parameters: [
          42, // int
          "9007199254740991", // long
          "12345.6789", // decimal as string
          3.14, // float
          2.718281828459045, // double
          [1, 2, 3], // array
          now, // datetime
          "Hello Firebolt!" // string
        ]
      }
    );

    const { data, meta } = await statement.fetchResult();

    // Check returned data (converted types as expected)
    expect(data[0][0]).toEqual(42); // int
    expect(data[0][1]).toEqual(new BigNumber("9007199254740991")); // long
    expect(data[0][2]).toEqual("12345.6789"); // decimal
    expect(data[0][3]).toEqual(3.14); // float
    expect(data[0][4]).toEqual(new BigNumber("2.718281828459045")); // double
    expect(data[0][5]).toEqual([1, 2, 3]); // array of numbers
    expect(new Date(data[0][6])).toEqual(now); // datetime
    expect(data[0][7]).toEqual("Hello Firebolt!"); // string

    // Check metadata for types
    expect(meta.map((m: any) => m.type)).toEqual([
      "int", // $1
      "long", // $2
      "decimal", // $3
      "float", // $4
      "double", // $5
      "array(int null)", // $6
      "timestamp", // $7
      "text" // $8
    ]);
  });
  it("normal parameters: should execute with more parameters provided", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT $1, $2", {
      parameters: [1, 2, 3]
    });
    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual([new BigNumber(1), new BigNumber(2)]);
    expect(meta).toEqual([
      {
        name: "?column?",
        type: "long"
      },
      {
        name: "?column?",
        type: "long"
      }
    ]);
  });
  it("normal parameters: should fail with random parameters index", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.execute("SELECT $34, $72", {
        parameters: [1, 2]
      })
    ).rejects.toThrow(
      /Line 1, Column 8: Query referenced positional parameter \$34, but it was not set/
    );
  });
  it("normal parameters: should throw error when not enough parameters provided", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    await expect(
      connection.execute("SELECT $1, $2", {
        parameters: [1]
      })
    ).rejects.toThrow(
      /Line 1, Column 12: Query referenced positional parameter \$2, but it was not set/
    );
  });
  it("normal query: should execute fine", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1::long");

    const { data, meta } = await statement.fetchResult();
    expect(data[0]).toEqual([new BigNumber(1)]);
    expect(meta).toEqual([
      {
        name: "?column?",
        type: "long"
      }
    ]);
  });
});
