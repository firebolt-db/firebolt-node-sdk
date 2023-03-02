import BigNumber from "bignumber.js";
import {
  PGDate,
  QueryFormatter,
  TimestampTZ,
  TimestampNTZ,
  Tuple
} from "../../src/formatter";

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
      new Date("2022-05-04 17:37:19")
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select '2022-05-04 17:37:19' from table"`
    );
  });

  it("format date", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select ? from table";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new Date("1000-01-01 12:21:21")
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select '1000-01-01 12:21:21' from table"`
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
      new TimestampTZ("2023-12-12 00:00:00", { timeZone: "UTC" }),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00.000000 UTC', 'str')"`
    );
  });
  it("format timestampTZ with microseconds padding", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampTZ("2023-12-12 00:00:00.123", { timeZone: "UTC" }),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00.123000 UTC', 'str')"`
    );
  });
  it("format timestampNTZ", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampNTZ("2023-12-12 00:00:00"),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00.000000', 'str')"`
    );
  });
  it("format timestampNTZ with microseconds padding", () => {
    const queryFormatter = new QueryFormatter();
    const query = "insert into foo values(?, ?)";
    const formattedQuery = queryFormatter.formatQuery(query, [
      new TimestampNTZ("2023-12-12 00:00:00.123"),
      "str"
    ]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"insert into foo values('2023-12-12 00:00:00.123000', 'str')"`
    );
  });
  it("format bytea", () => {
    const queryFormatter = new QueryFormatter();
    const query = "SELECT 'hello_world'::bytea == ?";
    const buffer = Buffer.from("68656c6c6f5f776f726c64", "hex");
    const formattedQuery = queryFormatter.formatQuery(query, [buffer]);
    // Jest escaping rules are different, so we need to double the amount of quotes compared to .toEqual()
    expect(formattedQuery).toMatchInlineSnapshot(
      `"SELECT 'hello_world'::bytea == '\\\\\\\\x68656c6c6f5f776f726c64'"`
    );
  });
});
