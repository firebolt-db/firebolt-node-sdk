import BigNumber from "bignumber.js";
import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("data types", () => {
  it("handles integer types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 42::int, -100::int");
    const { data, meta } = await statement.fetchResult();

    expect(meta[0].type).toEqual("int");
    expect(meta[1].type).toEqual("int");
    expect(data[0][0]).toEqual(42);
    expect(data[0][1]).toEqual(-100);
  });

  it("handles long types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT 9223372036854775807::long, -9223372036854775808::long"
    );
    const { data, meta } = await statement.fetchResult();

    expect(meta[0].type).toEqual("long");
    expect(meta[1].type).toEqual("long");
    expect(data[0][0]).toEqual(new BigNumber("9223372036854775807"));
    expect(data[0][1]).toEqual(new BigNumber("-9223372036854775808"));
  });

  it("handles float and double types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT 3.14::float, 2.718281828459045::double"
    );
    const { data, meta } = await statement.fetchResult();

    // Core may return float as double
    expect(["float", "double"]).toContain(meta[0].type);
    expect(meta[1].type).toEqual("double");
    expect(data[0][0]).toBeCloseTo(3.14, 2);
    expect(data[0][1]).toEqual(new BigNumber("2.718281828459045"));
  });

  it("handles text types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT 'hello'::text, 'world'::text, ''::text"
    );
    const { data, meta } = await statement.fetchResult();

    expect(meta[0].type).toEqual("text");
    expect(meta[1].type).toEqual("text");
    expect(meta[2].type).toEqual("text");
    expect(data[0][0]).toEqual("hello");
    expect(data[0][1]).toEqual("world");
    expect(data[0][2]).toEqual("");
  });

  it("handles boolean types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT true::boolean, false::boolean"
    );
    const { data, meta } = await statement.fetchResult();

    expect(meta[0].type).toEqual("boolean");
    expect(meta[1].type).toEqual("boolean");
    expect(data[0][0]).toEqual(true);
    expect(data[0][1]).toEqual(false);
  });

  it("handles array types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT [1, 2, 3]::array(int), ['a', 'b', 'c']::array(text)"
    );
    const { data, meta } = await statement.fetchResult();

    expect(meta[0].type).toEqual("array(int)");
    expect(meta[1].type).toEqual("array(text)");
    expect(data[0][0]).toEqual([1, 2, 3]);
    expect(data[0][1]).toEqual(["a", "b", "c"]);
  });

  it("handles nullable types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT NULL::int, NULL::text, NULL::boolean"
    );
    const { data, meta } = await statement.fetchResult();

    expect(meta[0].type).toEqual("int null");
    expect(meta[1].type).toEqual("text null");
    expect(meta[2].type).toEqual("boolean null");
    expect(data[0][0]).toBeNull();
    expect(data[0][1]).toBeNull();
    expect(data[0][2]).toBeNull();
  });

  it("handles decimal types", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT 12345.6789::decimal(10,4)"
    );
    const { data, meta } = await statement.fetchResult();

    expect(meta[0].type).toEqual("decimal");
    expect(data[0][0]).toEqual("12345.6789");
  });
});

