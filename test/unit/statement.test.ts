import BigNumber from "bignumber.js";
import {
  PGDate,
  QueryFormatter,
  TimestampTZ,
  TimestampNTZ,
  Tuple
} from "../../src/formatter";
import { hydrateRow } from "../../src/statement/hydrateResponse";

describe("format query", () => {
  it("format", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, [1]);
    expect(formattedQuery).toMatchInlineSnapshot(`"select 1 from table"`);
  });
  it("format 2", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table where bar = ?";
    const formattedQuery = queryFormatter.formatQuery(query, [1, 2]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select 1 from table where bar = 2"`
    );
  });
  it("escape boolean", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select * from table where bar = ?;";
    const formattedQuery = queryFormatter.formatQuery(query, [true]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select * from table where bar = true;"`
    );
  });

  it("format ?", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, ["foo?"]);
    expect(formattedQuery).toMatchInlineSnapshot(`"select 'foo?' from table"`);
  });
  it("format \n", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, ["foo\nbar"]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select 'foo\\\\nbar' from table"`
    );
  });
  it("format '", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, ["foo'bar"]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select 'foo\\\\'bar' from table"`
    );
  });

  it("format '", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, ["foo`bar"]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select 'foo\`bar' from table"`
    );
  });
  it("format array", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, [["foo", 'bar"']]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select ['foo', 'bar\\\\\\"'] from table"`
    );
  });
  it("format nested array", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, [
      ["foo", ["foo", 'bar"']]
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select ['foo', ['foo', 'bar\\\\\\"']] from table"`
    );
  });
  it("escape bignumber", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const num = new BigNumber("688887797400064883");
    const formattedQuery = queryFormatter.formatQuery(query, [num]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select 688887797400064883 from table"`
    );
  });
  it("format date", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new Date("2022-05-04 17:37:19 UTC")
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select '2022-05-04 17:37:19' from table"`
    );
  });

  it("format date", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new Date("1000-01-01 12:21:21 UTC")
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select '1000-01-01 12:21:21' from table"`
    );
  });
  it("format date with milliseconds", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ?";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampNTZ("2023-12-12 00:00:00.123 UTC")
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select '2023-12-12 00:00:00.123'"`
    );
  });
  it("format date with few milliseconds", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ?";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampNTZ("2023-12-12 00:00:00.01 UTC")
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select '2023-12-12 00:00:00.010'"`
    );
  });
  it("format with comments", () => {
    const queryFormatter = new QueryFormatter();
    const query = "SELECT * FROM table WHERE /* a comment line? */ table.a = 4";
    try {
      queryFormatter.formatQuery(query, ["foo"]);
      expect(false).toEqual(true);
    } catch (error) {
      expect(true).toEqual(true);
    }
  });
  it("format with comments in strings", () => {
    const queryFormatter = new QueryFormatter();
    const query =
      "SELECT 'str \\' ? -- not comment', /* comment? */ ? -- comment?";
    const formattedQuery = queryFormatter.formatQuery(query, ["foo"]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"SELECT 'str \\\\' ? -- not comment', /* comment? */ 'foo' -- comment?"`
    );
  });
  it("format tuple", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select foo from bar where foo in ?";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new Tuple(["some", "other"])
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select foo from bar where foo in ('some', 'other')"`
    );
  });
  it("format tuple 2", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select foo, bar from baz where foo in ? and bar = ?";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new Tuple(["some", "other"]),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select foo, bar from baz where foo in ('some', 'other') and bar = 'str'"`
    );
  });
  it("format pgdate", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select foo, bar from baz where foo < ? and bar = ?";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new PGDate("2023-12-12"),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select foo, bar from baz where foo < '2023-12-12' and bar = 'str'"`
    );
  });
  it("format timestampTZ", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampTZ("2023-12-12 00:00:00 UTC", { timeZone: "UTC" }),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00 UTC', 'str')"`
    );
  });
  it("format timestampTZ with milliseconds", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampTZ("2023-12-12 00:00:00.123 UTC", { timeZone: "UTC" }),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00.123 UTC', 'str')"`
    );
  });
  it("format timestampNTZ", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampNTZ("2023-12-12 00:00:00 UTC"),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00', 'str')"`
    );
  });
  it("format timestampNTZ with milliseconds", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampNTZ("2023-12-12 00:00:00.123 UTC"),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00.123', 'str')"`
    );
  });
  it("format timestampNTZ with few milliseconds", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampNTZ("2023-12-12 00:00:00.01 UTC"),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00.010', 'str')"`
    );
  });
  it("format named parameter", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select :foo, :bar from table";
    const formattedQuery = queryFormatter.formatQuery(query, undefined, {
      foo: "my named param",
      bar: 123
    });
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select 'my named param', 123 from table"`
    );
  });
  it("format parameter name doesn't include minus", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select :named_param1-10 from table";
    const formattedQuery = queryFormatter.formatQuery(query, undefined, {
      named_param1: 100
    });
    expect(formattedQuery).toMatchInlineSnapshot(`"select 100-10 from table"`);
  });
  it("format parameter name is not cast operator", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select '123'::INT, :INT, '2023-03-01'::DATE from table";
    const formattedQuery = queryFormatter.formatQuery(query, undefined, {
      INT: 100
    });
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select '123'::INT, 100, '2023-03-01'::DATE from table"`
    );
  });
  it("format bytea", () => {
    const queryFormatter = new QueryFormatter();
    const query = "SELECT 'hello_world'::bytea == ?";
    const buffer = Buffer.from("68656c6c6f5f776f726c64", "hex");
    const formattedQuery = queryFormatter.formatQuery(query, [buffer]);
    // Jest escaping rules are different, so we need to double the amount of quotes compared to .toEqual()
    expect(formattedQuery).toMatchInlineSnapshot(
      `"SELECT 'hello_world'::bytea == E'\\\\x68\\\\x65\\\\x6c\\\\x6c\\\\x6f\\\\x5f\\\\x77\\\\x6f\\\\x72\\\\x6c\\\\x64'"`
    );
  });
});

describe("parse values", () => {
  it("parses inf and nan values", () => {
    const row = {
      pinf: "inf",
      ninf: "-inf",
      pnan: "nan",
      nnan: "-nan"
    };
    const meta = [
      { name: "pinf", type: "float" },
      { name: "ninf", type: "float" },
      { name: "pnan", type: "float" },
      { name: "nnan", type: "float" }
    ];
    const res: Record<string, number> = hydrateRow(row, meta, {});
    expect(res["pinf"]).toBe(Infinity);
    expect(res["ninf"]).toBe(-Infinity);
    expect(isNaN(res["pnan"])).toBe(true);
    expect(isNaN(res["nnan"])).toBe(true);
  });
});

describe("set statements", () => {
  it.each([
    ["select 1", false],
    ["set foo = 1", true],
    ["  set   foo = 1", true],
    ["update table set foo = 1", false]
  ])("detects set statement %s correctly", (query, expected) => {
    expect(new QueryFormatter().isSetStatement(query)).toBe(expected);
  });

  it.each([
    ["set foo = bar", "foo", "bar"],
    ["  set   foo     =   bar   ", "foo", "bar"],
    ["\t\r set \t\nfoo  \t\r   =   \t\n bar   \r\n", "foo", "bar"],
    ["set foo = bar;", "foo", "bar"],
    ["set a='some 'string'", "a", "some 'string"],
    [
      'set query_parameters={"name":"param1","value":"Hello, world!"}',
      "query_parameters",
      '{"name":"param1","value":"Hello, world!"}'
    ]
  ])("parses set statement %s correctly", (query, key, value) => {
    expect(new QueryFormatter().splitSetStatement(query)).toEqual([key, value]);
  });
});
