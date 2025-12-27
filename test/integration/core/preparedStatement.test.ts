import BigNumber from "bignumber.js";
import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("prepared statements", () => {
  it("executes query with positional parameters", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT ?, ?", {
      parameters: [1, 2]
    });
    const { data, meta } = await statement.fetchResult();

    expect(data[0]).toEqual([1, 2]);
    expect(meta.length).toEqual(2);
  });

  it("executes query with named parameters", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT :foo, :bar", {
      namedParameters: { foo: 1, bar: 2 }
    });
    const { data, meta } = await statement.fetchResult();

    expect(data[0]).toEqual([1, 2]);
    expect(meta.length).toEqual(2);
  });

  it("handles various data types with parameters", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const now = new Date();

    const statement = await connection.execute(
      "SELECT ?::int, ?::text, ?::double, ?::boolean, ?::datetime",
      {
        parameters: [42, "hello", 3.14, true, now]
      }
    );
    const { data, meta } = await statement.fetchResult();

    expect(data[0][0]).toEqual(42);
    expect(data[0][1]).toEqual("hello");
    expect(data[0][2]).toEqual(3.14);
    expect(data[0][3]).toEqual(true);
    expect(new Date(data[0][4])).toEqual(now);
    expect(meta.length).toEqual(5);
  });

  it("handles array parameters", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT ?::array(int)", {
      parameters: [[1, 2, 3]]
    });
    const { data, meta } = await statement.fetchResult();

    expect(data[0][0]).toEqual([1, 2, 3]);
    expect(meta[0].type).toEqual("array(int)");
  });

  it("handles long values with parameters", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT ?::long", {
      parameters: ["9007199254740991"]
    });
    const { data, meta } = await statement.fetchResult();

    expect(data[0][0]).toEqual(new BigNumber("9007199254740991"));
    expect(meta[0].type).toEqual("long");
  });

  it("handles NULL parameters", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT ?::int", {
      parameters: [null]
    });
    const { data, meta } = await statement.fetchResult();

    expect(data[0][0]).toBeNull();
    expect(meta[0].type).toEqual("int null");
  });

  it("handles multiple parameters in different positions", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT ?, ?, ?", {
      parameters: ["first", "second", "third"]
    });
    const { data } = await statement.fetchResult();

    expect(data[0]).toEqual(["first", "second", "third"]);
  });
});

