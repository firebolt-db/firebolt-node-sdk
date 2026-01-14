import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(500000);

describe("null struct integration tests", () => {
  let firebolt: any;
  let connection: any;

  beforeAll(async () => {
    firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    connection = await firebolt.connect(connectionParams);
  });

  it("should handle SELECT with null struct value (with normalization)", async () => {
    const query = `SELECT NULL::struct(a int, b text) as s`;

    const statement = await connection.execute(query, {
      response: { normalizeData: true }
    });
    const { data, meta } = await statement.fetchResult();

    expect(data.length).toBe(1);
    expect(data[0].s).toBeNull();
    expect(meta[0].name).toBe("s");
    expect(meta[0].type).toContain("struct");
  });

  it("should handle SELECT with null struct value (without normalization)", async () => {
    const query = `SELECT NULL::struct(a int, b text) as s, 'value' as col2`;

    const statement = await connection.execute(query, {
      response: { normalizeData: false }
    });
    const { data } = await statement.fetchResult();

    expect(data.length).toBe(1);
    expect(Array.isArray(data[0])).toBe(true);
    expect(data[0][0]).toBeNull();
    expect(data[0][1]).toBe("value");
  });
});
