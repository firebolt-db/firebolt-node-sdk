import BigNumber from "bignumber.js";
import { QueryFormatter } from "../../src/formatter";

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
  it("format 3", () => {
    const queryFormatter = new QueryFormatter();
    const query = "select * from table where bar = ? and foo = `some'?`";
    const formattedQuery = queryFormatter.formatQuery(query, [1]);
    expect(formattedQuery).toMatchInlineSnapshot(
      `"select * from table where bar = 1 and foo = \`some'?\`"`
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
});
