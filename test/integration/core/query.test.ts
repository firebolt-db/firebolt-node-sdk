import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("query execution", () => {
  it("executes simple SELECT query", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT 1 as value");
    const { data, meta } = await statement.fetchResult();

    expect(meta.length).toEqual(1);
    expect(meta[0].name).toEqual("value");
    expect(data.length).toEqual(1);
    expect(data[0][0]).toEqual(1);
  });

  it("executes query with multiple rows", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute(
      "SELECT * FROM (VALUES (1), (2), (3)) AS t(value)"
    );
    const { data } = await statement.fetchResult();

    expect(data.length).toEqual(3);
    expect(data[0][0]).toEqual(1);
    expect(data[1][0]).toEqual(2);
    expect(data[2][0]).toEqual(3);
  });

  it("executes query with parameters", async () => {
    const firebolt = Firebolt();

    const connection = await firebolt.connect(connectionParams);

    const statement = await connection.execute("SELECT ? as value", {
      parameters: [42]
    });
    const { data } = await statement.fetchResult();

    expect(data.length).toEqual(1);
    expect(data[0][0]).toEqual(42);
  });
});

