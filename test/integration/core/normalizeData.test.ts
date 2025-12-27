import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("normalized data", () => {
  it("returns array format by default", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1 as id, 'test' as name");
    const { data } = await statement.fetchResult();

    expect(Array.isArray(data[0])).toBe(true);
    expect(data[0]).toEqual([1, "test"]);
  });

  it("returns normalized object format when enabled", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1 as id, 'test' as name", {
      response: { normalizeData: true }
    });
    const { data } = await statement.fetchResult();

    expect(typeof data[0]).toBe("object");
    expect(data[0]).toEqual({ id: 1, name: "test" });
  });

  it("handles normalized data with multiple rows", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT * FROM (VALUES (1, 'a'), (2, 'b'), (3, 'c')) AS t(id, name)",
      {
        response: { normalizeData: true }
      }
    );
    const { data } = await statement.fetchResult();

    expect(data.length).toEqual(3);
    expect(data[0]).toEqual({ id: 1, name: "a" });
    expect(data[1]).toEqual({ id: 2, name: "b" });
    expect(data[2]).toEqual({ id: 3, name: "c" });
  });

  it("handles normalized data with NULL values", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT 1 as id, NULL::text as name",
      {
        response: { normalizeData: true }
      }
    );
    const { data } = await statement.fetchResult();

    expect(data[0]).toEqual({ id: 1, name: null });
  });
});

